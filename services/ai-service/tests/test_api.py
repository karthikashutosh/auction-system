from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app

client = TestClient(app)


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_embed_returns_vector(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from app.providers.instrumentation import InstrumentedEmbedder
    from app.providers.metrics import MetricsStore
    from tests.conftest import MockProvider

    emb = InstrumentedEmbedder(MockProvider(), Settings(), MetricsStore())  # type: ignore[arg-type]
    monkeypatch.setattr("app.routers.embed.embedder", emb)
    r = client.post("/embed", json={"text": "vintage camera"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["embedding"]) == 4 and body["provider"] == "mock"


def test_embed_rejects_empty() -> None:
    assert client.post("/embed", json={"text": ""}).status_code == 422


def test_search_empty_query_is_200_empty() -> None:
    r = client.post("/search", json={"query": "   "})
    assert r.status_code == 200 and r.json()["hits"] == []


def test_search_too_long_is_422_not_500() -> None:
    assert client.post("/search", json={"query": "x" * 501}).status_code == 422
