from fastapi import APIRouter

from app.core.config import settings
from app.core.db import acquire
from app.models.health import HealthResponse
from app.providers.registry import embedder

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.environment,
        embedding_provider=f"{embedder.name}:{embedder.model}",
    )


@router.get("/ready")
async def ready() -> dict[str, str]:
    async with acquire() as conn:
        await conn.fetchval("SELECT 1")
    return {"status": "ready"}
