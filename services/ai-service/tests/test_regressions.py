"""Tests written after the verification pass: each one pins a bug that was found."""
import asyncio
from typing import Any

import pytest

from app.core import db
from app.core.config import Settings
from app.providers.base import ConfigurationError, ProviderError
from app.providers.chat import ChatMessage
from app.providers.chat_registry import UnavailableChatProvider, build_chat_provider
from app.providers.registry import build_provider


@pytest.mark.parametrize("vendor", ["openai", "voyage"])
def test_embedding_only_vendors_still_boot_with_chat_unavailable(vendor: str) -> None:
    cfg = Settings(ai_provider=vendor, ai_api_key="k", embedding_provider="", chat_provider="")
    assert build_provider(cfg).name == vendor
    chat = build_chat_provider(cfg)
    assert isinstance(chat, UnavailableChatProvider)


async def test_unavailable_chat_is_a_non_retryable_provider_error() -> None:
    with pytest.raises(ProviderError) as e:
        await UnavailableChatProvider("openai").complete(system="s", messages=[ChatMessage(role="user", content="x")], tools=[])
    assert not e.value.retryable and "CHAT_PROVIDER" in str(e.value)


def test_anthropic_alone_gives_a_clear_embedding_error() -> None:
    cfg = Settings(ai_provider="anthropic", ai_api_key="k", embedding_provider="", chat_provider="")
    with pytest.raises(ConfigurationError, match="no embeddings"):
        build_provider(cfg)
    assert build_chat_provider(cfg).name == "anthropic"


async def test_concurrent_first_requests_create_exactly_one_pool(monkeypatch: pytest.MonkeyPatch) -> None:
    created: list[int] = []

    async def fake_create_pool(*a: Any, **k: Any) -> object:
        created.append(1)
        await asyncio.sleep(0.05)  # widen the race window
        return object()

    monkeypatch.setattr(db, "_pool", None)
    monkeypatch.setattr(db.asyncpg, "create_pool", fake_create_pool)
    await asyncio.gather(*[db.init_pool() for _ in range(10)])
    assert len(created) == 1
    monkeypatch.setattr(db, "_pool", None)


def test_outlier_trim_never_shrinks_a_minimum_sample() -> None:
    """5 comparables incl. one outlier: trimming would leave 4 (< minimum) so the set is kept whole."""
    from uuid import UUID

    from app.services.valuation import MIN_COMPARABLES, Candidate, trim_price_outliers

    cs = [Candidate(UUID(int=i), f"t{i}", UUID(int=100 + i), "c", p, 0.1) for i, p in enumerate([9000, 10000, 11000, 10500, 250000])]
    assert len(trim_price_outliers(cs)) == len(cs) == MIN_COMPARABLES


def test_verdict_confidence_is_bounded() -> None:
    from pydantic import ValidationError

    from app.models.agent import Verdict, VerdictDraft

    for bad in (-0.1, 1.5):
        with pytest.raises(ValidationError):
            VerdictDraft(verdict="benign", confidence=bad, evidence=[], reasoning="r")
        with pytest.raises(ValidationError):
            Verdict(investigation_id="x", verdict="benign", confidence=bad, evidence=[], reasoning="r", turns=1, tool_calls=0, cost_usd=0)


def test_search_survives_control_characters(monkeypatch: pytest.MonkeyPatch) -> None:
    """A NUL byte in the query used to reach Postgres as a text parameter and crash the request."""
    from fastapi.testclient import TestClient

    from app.main import app

    seen: list[str] = []

    async def fake_run_search(conn: Any, **kw: Any) -> list[Any]:
        seen.append(kw["query"])
        return []

    class _Conn:
        async def __aenter__(self) -> "_Conn":
            return self

        async def __aexit__(self, *a: Any) -> None:
            return None

    monkeypatch.setattr("app.routers.search.run_search", fake_run_search)
    monkeypatch.setattr("app.routers.search.acquire", lambda: _Conn())
    r = TestClient(app).post("/search", json={"query": "cam\x00era\x07 lens", "mode": "lexical"})
    assert r.status_code == 200 and seen == ["cam era lens"]
    assert TestClient(app).post("/search", json={"query": "\x00\x01", "mode": "lexical"}).json()["hits"] == []
