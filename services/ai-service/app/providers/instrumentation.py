import time

from app.core.config import Settings
from app.core.logging import get_logger, log_fields
from app.core.tracing import span
from app.providers.base import EmbeddingProvider, EmbeddingResult, ProviderError
from app.providers.metrics import CallRecord, MetricsStore, metrics_store
from app.providers.resilience import CircuitBreaker, CircuitOpenError, retry_with_backoff

logger = get_logger("ai_call")

# USD per 1M tokens
EMBED_PRICE_PER_M: dict[str, float] = {
    "text-embedding-3-small": 0.02,
    "voyage-3-large": 0.18,
    "gemini-embedding-001": 0.15,
}


class InstrumentedEmbedder:
    """Wraps a provider with retry + breaker + one structured log line/metric per call."""

    def __init__(
        self,
        provider: EmbeddingProvider,
        cfg: Settings,
        store: MetricsStore = metrics_store,
        breaker: CircuitBreaker | None = None,
    ) -> None:
        self.provider = provider
        self.cfg = cfg
        self.store = store
        self.breaker = breaker or CircuitBreaker(cfg.breaker_failure_threshold, cfg.breaker_reset_s)

    @property
    def name(self) -> str:
        return self.provider.name

    @property
    def model(self) -> str:
        return self.provider.model

    @property
    def dimensions(self) -> int:
        return self.provider.dimensions

    async def embed(
        self, texts: list[str], *, feature: str, input_type: str = "document"
    ) -> EmbeddingResult:
        started = time.perf_counter()
        validation = "ok"
        error: str | None = None
        result: EmbeddingResult | None = None
        try:
            self.breaker.before_call()

            async def call() -> EmbeddingResult:
                with span("llm.embed", provider=self.provider.name, model=self.provider.model, feature=feature, n=len(texts)):
                    return await self.provider.embed(texts, input_type=input_type)

            try:
                result = await retry_with_backoff(call, max_retries=self.cfg.provider_max_retries)
            except ProviderError:
                self.breaker.record_failure()
                raise
            self.breaker.record_success()
            if len(result.vectors) != len(texts) or any(
                len(v) != self.provider.dimensions for v in result.vectors
            ):
                validation = "failed"
                raise ProviderError("embedding shape validation failed")
            return result
        except CircuitOpenError as exc:
            error = "circuit_open"
            raise ProviderError(str(exc), status_code=503) from exc
        except ProviderError as exc:
            error = error or str(exc)
            raise
        finally:
            tokens = result.tokens if result else 0
            price = EMBED_PRICE_PER_M.get(self.provider.model, 0.0)
            record = CallRecord(
                provider=self.provider.name,
                model=self.provider.model,
                operation="embed",
                feature=feature,
                latency_ms=round((time.perf_counter() - started) * 1000, 2),
                tokens=tokens,
                cost_usd=tokens / 1_000_000 * price,
                validation=validation,
                error=error,
            )
            self.store.add(record)
            log_fields(logger, "ai_call", **record.__dict__)
