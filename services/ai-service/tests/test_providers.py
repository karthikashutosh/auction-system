import pytest

from app.core.config import Settings
from app.providers.base import ConfigurationError, ProviderError
from app.providers.registry import build_provider
from app.providers.resilience import CircuitBreaker, CircuitOpenError, retry_with_backoff
from tests.conftest import MockProvider, err


def test_registry_raises_when_key_missing() -> None:
    with pytest.raises(ConfigurationError, match="OPENAI_API_KEY"):
        build_provider(Settings(embedding_provider="openai", openai_api_key="", ai_api_key=""))
    with pytest.raises(ConfigurationError, match="VOYAGE_API_KEY"):
        build_provider(Settings(embedding_provider="voyage", voyage_api_key="", ai_api_key=""))


def test_registry_unknown_provider() -> None:
    with pytest.raises(ConfigurationError):
        build_provider(Settings(embedding_provider="nope"))


def test_registry_builds_each_provider() -> None:
    assert build_provider(Settings(embedding_provider="openai", openai_api_key="k")).name == "openai"
    assert build_provider(Settings(embedding_provider="voyage", voyage_api_key="k")).name == "voyage"


async def test_retry_succeeds_after_transient_errors() -> None:
    attempts = {"n": 0}

    async def flaky() -> str:
        attempts["n"] += 1
        if attempts["n"] < 3:
            raise err(429)
        return "ok"

    assert await retry_with_backoff(flaky, max_retries=3) == "ok"
    assert attempts["n"] == 3


async def test_retry_does_not_retry_4xx() -> None:
    attempts = {"n": 0}

    async def bad() -> str:
        attempts["n"] += 1
        raise err(400)

    with pytest.raises(ProviderError):
        await retry_with_backoff(bad, max_retries=3)
    assert attempts["n"] == 1


async def test_retry_gives_up_after_max() -> None:
    attempts = {"n": 0}

    async def down() -> str:
        attempts["n"] += 1
        raise err(503)

    with pytest.raises(ProviderError):
        await retry_with_backoff(down, max_retries=2)
    assert attempts["n"] == 3


def test_breaker_opens_and_recovers() -> None:
    now = {"t": 0.0}
    b = CircuitBreaker(failure_threshold=3, reset_s=10, clock=lambda: now["t"])
    for _ in range(3):
        b.record_failure()
    assert b.state == "open"
    with pytest.raises(CircuitOpenError):
        b.before_call()
    now["t"] = 11
    assert b.state == "half_open"
    b.before_call()  # trial allowed
    b.record_success()
    assert b.state == "closed"


def test_breaker_half_open_failure_reopens() -> None:
    now = {"t": 0.0}
    b = CircuitBreaker(2, 10, clock=lambda: now["t"])
    b.record_failure()
    b.record_failure()
    now["t"] = 11
    b.record_failure()
    assert b.state == "open"


def test_success_resets_failure_count() -> None:
    b = CircuitBreaker(3, 10)
    b.record_failure()
    b.record_failure()
    b.record_success()
    b.record_failure()
    assert b.state == "closed"


async def test_embedder_logs_one_record_with_all_fields(make_embedder, store) -> None:  # type: ignore[no-untyped-def]
    e = make_embedder(MockProvider())
    await e.embed(["a", "b"], feature="unit")
    assert len(store.records) == 1
    r = store.records[0]
    assert (r.provider, r.model, r.operation, r.feature, r.validation) == ("mock", "mock-1", "embed", "unit", "ok")
    assert r.tokens == 6 and r.latency_ms >= 0 and r.cost_usd == 0.0


async def test_embedder_validation_failure_on_wrong_dimension(make_embedder, store) -> None:  # type: ignore[no-untyped-def]
    from app.providers.base import EmbeddingResult

    p = MockProvider([EmbeddingResult(vectors=[[1.0, 2.0]], tokens=1)])
    e = make_embedder(p)
    with pytest.raises(ProviderError):
        await e.embed(["x"], feature="unit")
    assert store.records[0].validation == "failed"


async def test_embedder_breaker_opens_after_failures(make_embedder, store) -> None:  # type: ignore[no-untyped-def]
    p = MockProvider([err(500)] * 20)
    e = make_embedder(p)
    for _ in range(3):
        with pytest.raises(ProviderError):
            await e.embed(["x"], feature="unit")
    calls_before = p.calls
    with pytest.raises(ProviderError) as ei:
        await e.embed(["x"], feature="unit")
    assert ei.value.status_code == 503
    assert p.calls == calls_before  # fast-failed, provider untouched
    assert store.records[-1].error == "circuit_open"
