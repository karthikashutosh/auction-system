import time

from app.core.config import Settings
from app.core.logging import get_logger, log_fields
from app.core.tracing import span
from app.providers.base import ProviderError
from app.providers.chat import ChatMessage, ChatProvider, ChatResponse, ToolSpec
from app.providers.metrics import CallRecord, MetricsStore, metrics_store
from app.providers.resilience import CircuitBreaker, CircuitOpenError, retry_with_backoff

logger = get_logger("ai_call")

# (input, output) USD per 1M tokens. Estimates: verify against current provider pricing.
CHAT_PRICE_PER_M: dict[str, tuple[float, float]] = {
    "claude-sonnet-5-5": (3.0, 15.0),
    "gemini-3.1-flash-lite": (0.10, 0.40),  # estimate: verify pricing
}


class InstrumentedChat:
    def __init__(
        self,
        provider: ChatProvider,
        cfg: Settings,
        store: MetricsStore = metrics_store,
    ) -> None:
        self.provider = provider
        self.cfg = cfg
        self.store = store
        self.breaker = CircuitBreaker(cfg.breaker_failure_threshold, cfg.breaker_reset_s)

    @property
    def name(self) -> str:
        return self.provider.name

    @property
    def model(self) -> str:
        return self.provider.model

    def cost(self, resp: ChatResponse) -> float:
        pin, pout = CHAT_PRICE_PER_M.get(self.provider.model, (0.0, 0.0))
        return (resp.input_tokens * pin + resp.output_tokens * pout) / 1_000_000

    async def complete(
        self,
        *,
        system: str,
        messages: list[ChatMessage],
        tools: list[ToolSpec],
        feature: str,
        validate: bool = True,
    ) -> ChatResponse:
        started = time.perf_counter()
        resp: ChatResponse | None = None
        error: str | None = None
        try:
            self.breaker.before_call()

            async def call() -> ChatResponse:
                with span("llm.chat", provider=self.provider.name, model=self.provider.model, feature=feature) as sp:
                    out = await self.provider.complete(system=system, messages=messages, tools=tools)
                    sp.set_attribute("llm.tokens", out.input_tokens + out.output_tokens)
                    sp.set_attribute("llm.cost_usd", self.cost(out))
                    return out

            try:
                resp = await retry_with_backoff(call, max_retries=self.cfg.provider_max_retries)
            except ProviderError:
                self.breaker.record_failure()
                raise
            self.breaker.record_success()
            return resp
        except CircuitOpenError as exc:
            error = "circuit_open"
            raise ProviderError(str(exc), status_code=503) from exc
        except ProviderError as exc:
            error = str(exc)
            raise
        finally:
            record = CallRecord(
                provider=self.provider.name,
                model=self.provider.model,
                operation="chat",
                feature=feature,
                latency_ms=round((time.perf_counter() - started) * 1000, 2),
                tokens=(resp.input_tokens + resp.output_tokens) if resp else 0,
                cost_usd=self.cost(resp) if resp else 0.0,
                validation="ok",
                error=error,
            )
            self.store.add(record)
            log_fields(logger, "ai_call", **record.__dict__)

    def mark_validation_failed(self, feature: str) -> None:
        """Called when the model's output failed schema validation downstream."""
        rec = CallRecord(
            provider=self.provider.name,
            model=self.provider.model,
            operation="chat_validation",
            feature=feature,
            latency_ms=0.0,
            tokens=0,
            cost_usd=0.0,
            validation="failed",
        )
        self.store.add(rec)
        log_fields(logger, "ai_call", **rec.__dict__)
