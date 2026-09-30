import json
import re
import uuid
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph
from pydantic import ValidationError

from app.core.config import settings
from app.core.tracing import span
from app.models.agent import Verdict, VerdictDraft, VerificationResult
from app.providers.chat import ChatMessage, ToolCall
from app.providers.chat_instrumentation import InstrumentedChat
from app.services.agent_tools import TOOL_SPECS, run_tool, summarize

SYSTEM = """TASK:investigate
You are a fraud analyst for an online auction site. A statistical detector flagged one bid. Decide whether
the bidder's behaviour is suspicious, benign, or inconclusive by looking things up with the tools.

Method:
- The first user message is JSON: the flagged bid, the bidder (user_id), the auction (auction_id), the
  detector score and its features. The detector is a hint, not proof: it can be wrong in both directions.
- Check ALL of these four signal families before deciding. Each maps to a tool field:
  1. Account age: getAccountMetadata.age_hours_at_first_bid. A few hours or days means the account bid almost
     immediately after signing up. Ignore age_hours_now for this: it only says how old the account is today.
  2. Seller concentration: getBidderHistory.top_seller_share, total_bids and distinct_sellers. Many bids that
     all go to one seller is suspicious. If the share is high (>= 0.5) with at least 8 bids, ALSO call
     getSellerAuctions for that seller_id to see whether this bidder dominates the seller's auctions.
  3. Timing bursts: getBidTimeline.seconds_since_previous for THIS bidder's bids. Many bids seconds apart
     (single digits) are a burst; one human cannot bid every 2-4 seconds.
  4. Last-second bidding: getBidTimeline.seconds_before_close for this bidder's bids. Several bids inside the
     final ~15 seconds is sniping.
- Read the tool results' actual numbers; do not summarise a result you have not looked at. Never invent data.
- Do not repeat a call with identical arguments. If a tool returns an error, try another tool that can answer
  the question, or say in your reasoning what you could not check.
- Verdict rules: "suspicious" needs at least two concrete signals from different families, or one very strong
  one (e.g. 10+ bids seconds apart). "benign" requires that you actually checked all four families and found
  none. If a family could not be checked, or the evidence is mixed, answer "inconclusive". Lower the
  confidence when evidence is thin.
- When done, reply with ONLY a JSON object:
  {"verdict": "suspicious"|"benign"|"inconclusive", "confidence": 0..1, "evidence": [short factual strings
  quoting numbers from tool results], "reasoning": "2-4 sentences"}. Every evidence string must be supported
  by a tool result."""

VERIFY_SYSTEM = """TASK:verify
You check another analyst's conclusion. You get JSON with the draft verdict and evidence, and how many tool
results were seen. Reply ONLY with JSON: {"supported": true|false, "reason": "..."}. supported=false if the
evidence is too thin or does not justify the verdict and confidence."""


class AgentState(TypedDict):
    messages: list[ChatMessage]
    turns: int
    cost: float
    tool_calls: int
    seen_calls: list[str]
    evidence_log: list[str]
    trajectory: list[dict[str, Any]]
    aborted: str | None
    final_text: str | None
    verdict: Verdict | None


def _json_from(text: str) -> Any:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    return json.loads(m.group(0) if m else text)


def build_graph(
    chat: InstrumentedChat,
    investigation_id: str,
    *,
    max_turns: int,
    max_cost: float,
    fail_tools: set[str] | None = None,
) -> Any:
    async def model_node(state: AgentState) -> dict[str, Any]:
        if state["turns"] >= max_turns:
            return {"aborted": "max_turns"}
        if state["cost"] >= max_cost:
            return {"aborted": "cost_ceiling"}
        resp = await chat.complete(system=SYSTEM, messages=state["messages"], tools=TOOL_SPECS, feature="agent_turn")
        cost = chat.cost(resp)
        turn = state["turns"] + 1
        traj = state["trajectory"] + [
            {
                "investigation_id": investigation_id, "turn": turn, "kind": "llm",
                "tool": None, "args": None,
                "result_summary": "tool request" if resp.tool_calls else "final answer",
                "tokens": resp.input_tokens + resp.output_tokens, "cost_usd": cost,
            }
        ]
        assistant = ChatMessage(role="assistant", content=resp.text or "", tool_calls=resp.tool_calls)
        update: dict[str, Any] = {
            "messages": state["messages"] + [assistant], "turns": turn,
            "cost": state["cost"] + cost, "trajectory": traj,
        }
        if not resp.tool_calls:
            update["final_text"] = resp.text or ""
        return update

    async def tools_node(state: AgentState) -> dict[str, Any]:
        last = state["messages"][-1]
        messages = list(state["messages"])
        seen = list(state["seen_calls"])
        traj = list(state["trajectory"])
        evidence = list(state["evidence_log"])
        n_calls = state["tool_calls"]
        for tc in last.tool_calls:
            key = f"{tc.name}:{json.dumps(tc.arguments, sort_keys=True)}"
            if key in seen:  # same tool, same args, twice -> stuck
                return {"messages": messages, "aborted": "stuck_loop", "trajectory": traj, "seen_calls": seen}
            seen.append(key)
            result = await run_tool(tc.name, tc.arguments, fail=fail_tools)
            n_calls += 1
            summary = summarize(result)
            evidence.append(f"{tc.name}: {summary}")
            traj.append({
                "investigation_id": investigation_id, "turn": state["turns"], "kind": "tool",
                "tool": tc.name, "args": tc.arguments, "result_summary": summary,
                "tokens": 0, "cost_usd": 0.0, "error": not result.ok,
            })
            messages.append(ChatMessage(role="tool", content=result.model_dump_json(), tool_call_id=tc.id, tool_name=tc.name))
        return {"messages": messages, "seen_calls": seen, "trajectory": traj, "evidence_log": evidence, "tool_calls": n_calls}

    def _result(state: AgentState, draft: VerdictDraft, verification: str, reason: str | None = None) -> Verdict:
        return Verdict(
            investigation_id=investigation_id, verdict=draft.verdict, confidence=draft.confidence,
            evidence=draft.evidence, reasoning=draft.reasoning, turns=state["turns"],
            tool_calls=state["tool_calls"], cost_usd=round(state["cost"], 6),
            aborted_reason=reason,
            verification=verification,
        )

    async def verify_node(state: AgentState) -> dict[str, Any]:
        try:
            draft = VerdictDraft.model_validate(_json_from(state["final_text"] or ""))
        except (ValidationError, ValueError):
            chat.mark_validation_failed("agent_turn")
            draft = VerdictDraft(verdict="inconclusive", confidence=0.2, evidence=[], reasoning="Model did not return a valid verdict object.")
            return {"verdict": _result(state, draft, "downgraded")}

        verification = "supported"
        if draft.verdict != "inconclusive" and not draft.evidence:
            draft.confidence = min(draft.confidence, 0.3)
            verification = "downgraded"
        else:
            payload = json.dumps({"draft": draft.model_dump(), "tool_results_seen": state["tool_calls"]})
            resp = await chat.complete(
                system=VERIFY_SYSTEM, messages=[ChatMessage(role="user", content=payload)], tools=[], feature="agent_verify"
            )
            try:
                check = VerificationResult.model_validate(_json_from(resp.text or ""))
            except (ValidationError, ValueError):
                chat.mark_validation_failed("agent_verify")
                check = VerificationResult(supported=False, reason="verifier output invalid")
            state = {**state, "cost": state["cost"] + chat.cost(resp)}
            if not check.supported:
                draft.confidence = min(draft.confidence, 0.4)
                verification = "downgraded"
        return {"verdict": _result(state, draft, verification)}

    async def partial_node(state: AgentState) -> dict[str, Any]:
        reason = state["aborted"]
        draft = VerdictDraft(
            verdict="inconclusive", confidence=0.2,
            evidence=state["evidence_log"][:12],
            reasoning=f"Investigation stopped early ({reason}) after {state['turns']} turns; findings so far are partial.",
        )
        return {"verdict": _result(state, draft, "skipped", reason)}

    def after_model(state: AgentState) -> str:
        if state["aborted"]:
            return "partial"
        return "verify" if state["final_text"] is not None else "tools"

    def after_tools(state: AgentState) -> str:
        return "partial" if state["aborted"] else "model"

    g = StateGraph(AgentState)
    g.add_node("model", model_node)
    g.add_node("tools", tools_node)
    g.add_node("verify", verify_node)
    g.add_node("partial", partial_node)
    g.add_edge(START, "model")
    g.add_conditional_edges("model", after_model, {"tools": "tools", "verify": "verify", "partial": "partial"})
    g.add_conditional_edges("tools", after_tools, {"model": "model", "partial": "partial"})
    g.add_edge("verify", END)
    g.add_edge("partial", END)
    return g.compile()


async def run_investigation(
    chat: InstrumentedChat,
    *,
    context: dict[str, Any],
    max_turns: int | None = None,
    max_cost: float | None = None,
    fail_tools: set[str] | None = None,
) -> tuple[Verdict, list[dict[str, Any]]]:
    investigation_id = uuid.uuid4().hex[:12]
    graph = build_graph(
        chat, investigation_id,
        max_turns=max_turns or settings.agent_max_turns,
        max_cost=max_cost if max_cost is not None else settings.agent_max_cost_usd,
        fail_tools=fail_tools,
    )
    init: AgentState = {
        "messages": [ChatMessage(role="user", content=json.dumps(context, default=str))],
        "turns": 0, "cost": 0.0, "tool_calls": 0, "seen_calls": [], "evidence_log": [],
        "trajectory": [], "aborted": None, "final_text": None, "verdict": None,
    }
    with span("agent.investigation", investigation_id=investigation_id):
        final = await graph.ainvoke(init, {"recursion_limit": 60})
    verdict = final["verdict"]
    assert isinstance(verdict, Verdict)
    return verdict, final["trajectory"]


__all__ = ["ToolCall", "run_investigation"]
