"""Test doubles (NOT shipped in app/): a deterministic stand-in for a chat model."""
import json
from typing import Any

from app.providers.chat import ChatMessage, ChatResponse, ToolCall, ToolSpec


class StubChat:
    """Follows the tool protocol so the loop, guardrails and verdict handling can be tested offline."""

    name, model = "stub", "stub-v1"

    async def complete(self, *, system: str, messages: list[ChatMessage], tools: list[ToolSpec]) -> ChatResponse:
        if system.startswith("TASK:verify"):
            draft = json.loads(messages[-1].content)["draft"]
            ok = draft["verdict"] == "inconclusive" or len(draft["evidence"]) >= 2
            return ChatResponse(text=json.dumps({"supported": ok, "reason": "stub"}), input_tokens=5, output_tokens=5)
        ctx: dict[str, Any] = json.loads(messages[0].content)
        done = {m.tool_name: json.loads(m.content) for m in messages if m.role == "tool" and m.tool_name}
        turn = sum(1 for m in messages if m.role == "assistant")
        for name, arg in (("getAccountMetadata", "user_id"), ("getBidderHistory", "user_id"), ("getBidTimeline", "auction_id")):
            if name not in done:
                return ChatResponse(tool_calls=[ToolCall(id=f"c{turn}", name=name, arguments={arg: ctx[arg]})], input_tokens=10, output_tokens=5)
        evidence: list[str] = []
        limits: list[str] = []
        tl = done["getBidTimeline"]
        if tl.get("ok"):
            fast = [b for b in tl["bids"] if b["user_id"] == ctx["user_id"] and (b["seconds_since_previous"] or 99) < 10]
            if len(fast) >= 3:
                evidence += [f"{len(fast)} bids within 10s of the previous bid", "bidder dominates the auction timeline"]
        else:
            limits.append("bid timeline unavailable")
        verdict = "suspicious" if len(evidence) >= 2 else ("inconclusive" if limits else "benign")
        if verdict == "benign":
            evidence.append("no rapid bidding in the timeline")
        text = json.dumps({"verdict": verdict, "confidence": 0.8 if evidence else 0.3, "evidence": evidence,
                           "reasoning": "stub reasoning" + (f"; {', '.join(limits)}" if limits else "")})
        return ChatResponse(text=text, input_tokens=10, output_tokens=20)
