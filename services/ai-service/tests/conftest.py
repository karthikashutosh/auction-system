import os

# Hermetic tests: never inherit providers/keys from a developer's .env.
for _k in ("EMBEDDING_PROVIDER", "CHAT_PROVIDER", "OPENAI_API_KEY", "VOYAGE_API_KEY", "ANTHROPIC_API_KEY"):
    os.environ[_k] = ""
# The app refuses to boot without a provider; tests use a dummy Gemini config and never hit the network.
os.environ["AI_PROVIDER"] = "gemini"
os.environ["AI_API_KEY"] = "test-key"

import pytest

from app.core.config import Settings
from app.providers.base import EmbeddingResult, ProviderError
from app.providers.instrumentation import InstrumentedEmbedder
from app.providers.metrics import MetricsStore


class MockProvider:
    name = "mock"
    model = "mock-1"
    dimensions = 4

    def __init__(self, script: list[object] | None = None) -> None:
        # each item: an EmbeddingResult to return or an Exception to raise
        self.script = list(script or [])
        self.calls = 0

    async def embed(self, texts: list[str], *, input_type: str = "document") -> EmbeddingResult:
        self.calls += 1
        if self.script:
            item = self.script.pop(0)
            if isinstance(item, Exception):
                raise item
            assert isinstance(item, EmbeddingResult)
            return item
        return EmbeddingResult(vectors=[[0.1, 0.2, 0.3, 0.4] for _ in texts], tokens=len(texts) * 3)


@pytest.fixture
def cfg() -> Settings:
    return Settings(provider_max_retries=2, breaker_failure_threshold=3, breaker_reset_s=10, embedding_provider="gemini", ai_api_key="test-key")


@pytest.fixture
def store() -> MetricsStore:
    return MetricsStore()


@pytest.fixture
def make_embedder(cfg: Settings, store: MetricsStore):  # type: ignore[no-untyped-def]
    def _make(provider: MockProvider) -> InstrumentedEmbedder:
        return InstrumentedEmbedder(provider, cfg, store)  # type: ignore[arg-type]

    return _make


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fast(_: float) -> None:
        return None

    monkeypatch.setattr("app.providers.resilience.asyncio.sleep", fast)


def err(status: int | None) -> ProviderError:
    return ProviderError("boom", status_code=status)
