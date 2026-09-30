from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.db import acquire, close_pool
from app.core.tracing import buffer, setup_tracing, span, summarize_spans
from app.providers.base import ProviderError
from app.providers.http import close_http_client
from app.providers.metrics import metrics_store
from app.services.fraud import refresh_baseline
from app.routers import embed, fraud, health, investigate, search, valuation


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:  # warm the fraud baseline; the service must still boot if Postgres is down
        async with acquire() as conn:
            await refresh_baseline(conn)
    except Exception:  # noqa: BLE001
        pass
    yield
    await close_http_client()
    await close_pool()


setup_tracing()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(health.router)
app.include_router(embed.router)
app.include_router(search.router)
app.include_router(valuation.router)
app.include_router(fraud.router)
app.include_router(investigate.router)


@app.exception_handler(ProviderError)
async def provider_error_handler(_: Request, exc: ProviderError) -> JSONResponse:
    status = 503 if exc.status_code in (None, 429, 503) or (exc.status_code or 0) >= 500 else 502
    return JSONResponse(status_code=status, content={"code": "PROVIDER_UNAVAILABLE", "message": str(exc)})


@app.get("/metrics", tags=["health"])
def metrics() -> dict[str, object]:
    return {
        "by_feature": metrics_store.summary(),
        "validation_failure_by_provider": metrics_store.validation_failure_by_provider(),
    }


@app.middleware("http")
async def trace_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
    with span("http.request", **{"http.method": request.method, "http.target": request.url.path}) as sp:
        response = await call_next(request)
        sp.set_attribute("http.status_code", response.status_code)
        return response


if settings.otel_enabled:

    @app.get("/debug/spans", tags=["health"])
    def debug_spans(reset: bool = False) -> dict[str, dict[str, float]]:
        out = summarize_spans()
        if reset:
            buffer.clear()
        return out
