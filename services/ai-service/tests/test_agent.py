import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import pytest

from app.core.config import Settings
from app.models.agent import (
    AccountMetadata,
    BidderHistory,
    BidTimeline,
    SellerAuctions,
    TimelineBid,
    ToolError,
)
from app.providers.chat import ChatMessage, ChatResponse, ToolCall, ToolSpec
from app.providers.chat_instrumentation import InstrumentedChat
from app.providers.metrics import MetricsStore
from tests.doubles import StubChat
from app.services import agent as agent_mod
from app.services.agent import run_investigation

U = UUID(int=1)
S = UUID(int=2)
A = UUID(int=3)
CTX: dict[str, Any] = {"flagged_bid_id": str(UUID(int=9)), "user_id": str(U), "auction_id": str(A), "detector_score": 0.9}
NOW = datetime.now(UTC)


def make_chat(provider: Any) -> InstrumentedChat:
    return InstrumentedChat(provider, Settings(), MetricsStore())


def bot_timeline() -> BidTimeline:
    bids = [
        TimelineBid(bid_id=UUID(int=100 + i), user_id=U, amount=1000 + i * 100, at=NOW + timedelta(seconds=3 * i),
                    seconds_since_previous=None if i == 0 else 3.0, seconds_before_close=5000 - 3 * i)
        for i in range(15)
    ]
    return BidTimeline(auction_id=A, bid_count=len(bids), bids=bids)


async def stub_tools(name: str, arguments: dict[str, Any], *, fail: set[str] | None = None) -> Any:
    if fail and name in fail:
        return ToolError(code="unavailable", message=f"{name} is temporarily unavailable", retryable=True)
    if name == "getAccountMetadata":
        return AccountMetadata(user_id=U, name="x", role="user", created_at=NOW, age_hours_now=200.0, age_hours_at_first_bid=100.0, total_bids=40, auctions_owned=0)
    if name == "getBidderHistory":
        return BidderHistory(user_id=U, total_bids=40, distinct_auctions=3, distinct_sellers=2, top_seller_id=S, top_seller_share=0.5, recent_bids=[])
    if name == "getBidTimeline":
        return bot_timeline()
    if name == "getSellerAuctions":
        return SellerAuctions(seller_id=S, auction_count=0, auctions=[])
    return ToolError(code="invalid_argument", message="unknown tool")


@pytest.fixture(autouse=True)
def patch_tools(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(agent_mod, "run_tool", stub_tools)


async def test_full_investigation_produces_validated_verdict() -> None:
    verdict, traj = await run_investigation(make_chat(StubChat()), context=CTX)
    assert verdict.verdict == "suspicious" and 0 < verdict.confidence <= 1
    assert verdict.aborted_reason is None and verdict.verification == "supported"
    assert [t["tool"] for t in traj if t["kind"] == "tool"][:3] == ["getAccountMetadata", "getBidderHistory", "getBidTimeline"]


async def test_completes_when_one_tool_errors() -> None:
    verdict, traj = await run_investigation(make_chat(StubChat()), context=CTX, fail_tools={"getBidTimeline"})
    assert verdict.aborted_reason is None
    assert any(t.get("error") for t in traj if t["kind"] == "tool")
    assert "unavailable" in verdict.reasoning or verdict.verdict in ("inconclusive", "benign")


class LoopingProvider:
    """Requests the same tool with identical arguments forever."""

    name, model = "loop", "stub-v1"

    async def complete(self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]) -> ChatResponse:
        return ChatResponse(tool_calls=[ToolCall(id="c", name="getBidderHistory", arguments={"user_id": str(U)})], input_tokens=10, output_tokens=5)


async def test_stuck_loop_is_detected() -> None:
    verdict, _ = await run_investigation(make_chat(LoopingProvider()), context=CTX)
    assert verdict.aborted_reason == "stuck_loop" and verdict.verdict == "inconclusive"
    assert verdict.turns == 2


class WanderingProvider:
    """Always a *new* call, so only the hard turn limit can stop it."""

    name, model = "wander", "stub-v1"

    def __init__(self) -> None:
        self.i = 0

    async def complete(self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]) -> ChatResponse:
        self.i += 1
        return ChatResponse(tool_calls=[ToolCall(id=f"c{self.i}", name="getBidderHistory", arguments={"user_id": str(UUID(int=self.i))})])


async def test_max_turns_terminates() -> None:
    verdict, _ = await run_investigation(make_chat(WanderingProvider()), context=CTX, max_turns=4)
    assert verdict.aborted_reason == "max_turns" and verdict.turns == 4


class ExpensiveProvider(WanderingProvider):
    name, model = "pricey", "claude-sonnet-5-5"

    async def complete(self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]) -> ChatResponse:
        r = await super().complete(system=system, messages=messages, tools=tools)
        r.input_tokens, r.output_tokens = 50_000, 2_000
        return r


async def test_cost_ceiling_returns_clean_partial_result() -> None:
    verdict, _ = await run_investigation(make_chat(ExpensiveProvider()), context=CTX, max_cost=0.10)
    assert verdict.aborted_reason == "cost_ceiling"
    assert verdict.confidence <= 0.3 and verdict.verdict == "inconclusive"
    assert verdict.cost_usd >= 0.10 and verdict.evidence  # partial findings preserved


class OverconfidentProvider:
    """Says 'suspicious, 0.95' having looked at nothing."""

    name, model = "overconfident", "stub-v1"

    async def complete(self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]) -> ChatResponse:
        if system.startswith("TASK:verify"):
            return await StubChat().complete(system=system, messages=messages, tools=tools)
        text = json.dumps({"verdict": "suspicious", "confidence": 0.95, "evidence": ["seems shady"], "reasoning": "gut feeling"})
        return ChatResponse(text=text, input_tokens=5, output_tokens=5)


async def test_weak_evidence_is_downgraded_by_self_verification() -> None:
    verdict, _ = await run_investigation(make_chat(OverconfidentProvider()), context=CTX)
    assert verdict.confidence <= 0.4 and verdict.verification == "downgraded"


class GarbageProvider:
    name, model = "garbage", "stub-v1"

    async def complete(self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]) -> ChatResponse:
        return ChatResponse(text="I think it is fine!", input_tokens=1, output_tokens=1)


async def test_invalid_model_output_never_escapes_as_an_error() -> None:
    chat = make_chat(GarbageProvider())
    verdict, _ = await run_investigation(chat, context=CTX)
    assert verdict.verdict == "inconclusive" and verdict.confidence <= 0.3
    assert chat.store.validation_failure_by_provider()["garbage"] > 0
