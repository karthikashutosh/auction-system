"""Trajectory evaluation: score the *sequence* of steps, not just the final answer."""
import json
import re
from dataclasses import dataclass
from typing import Any

from app.models.agent import Verdict

TURN_THRESHOLD = 6
MIN_EVIDENCE = 2


@dataclass
class TrajectoryScore:
    investigation_id: str
    redundant_calls: int
    turns_over_threshold: bool
    concluded_without_lookup: bool
    low_evidence_conclusion: bool
    tool_errors: int
    ignored_tool_error: bool
    benign_despite_signal: list[str]

    @property
    def failures(self) -> list[str]:
        out = []
        if self.redundant_calls:
            out.append("redundant_calls")
        if self.turns_over_threshold:
            out.append("too_many_turns")
        if self.concluded_without_lookup:
            out.append("concluded_turn1_no_lookups")
        if self.low_evidence_conclusion:
            out.append("terminated_below_evidence_threshold")
        if self.ignored_tool_error:
            out.append("ignored_tool_error")
        if self.benign_despite_signal:
            out.append("benign_despite_strong_signal")
        return out


_FIRST_BID = re.compile(r"first bid at ([\d.]+)h")
_CONCENTRATION = re.compile(r"(\d+) bids, \d+ sellers, top seller share ([\d.]+)")
NEW_ACCOUNT_HOURS = 24 * 14
CONCENTRATION_SHARE, CONCENTRATION_MIN_BIDS = 0.8, 8


def strong_signals(tools: list[dict[str, Any]]) -> list[str]:
    """Objective red flags visible in the agent's OWN tool results (parsed from the summaries)."""
    found: list[str] = []
    for t in tools:
        summary = str(t.get("result_summary", ""))
        m = _FIRST_BID.search(summary)
        if m and float(m.group(1)) < NEW_ACCOUNT_HOURS:
            found.append(f"first_bid_{float(m.group(1)):.0f}h_after_signup")
        c = _CONCENTRATION.search(summary)
        if c and int(c.group(1)) >= CONCENTRATION_MIN_BIDS and float(c.group(2)) >= CONCENTRATION_SHARE:
            found.append(f"{float(c.group(2)):.0%}_of_{c.group(1)}_bids_on_one_seller")
    return found


def score_trajectory(traj: list[dict[str, Any]], verdict: Verdict) -> TrajectoryScore:
    tools = [t for t in traj if t["kind"] == "tool"]
    keys = [f"{t['tool']}:{json.dumps(t['args'], sort_keys=True)}" for t in tools]
    redundant = len(keys) - len(set(keys))
    llm_turns = [t for t in traj if t["kind"] == "llm"]
    errors = [t for t in tools if t.get("error")]
    concluded = verdict.aborted_reason is None
    # "ignored": a tool failed yet the verdict claims high confidence and never mentions the gap.
    ignored = bool(errors) and concluded and verdict.confidence >= 0.7 and "unavailable" not in verdict.reasoning.lower()
    return TrajectoryScore(
        investigation_id=verdict.investigation_id,
        redundant_calls=redundant,
        turns_over_threshold=len(llm_turns) > TURN_THRESHOLD,
        concluded_without_lookup=concluded and len(tools) == 0,
        low_evidence_conclusion=concluded and verdict.verdict != "inconclusive" and len(verdict.evidence) < MIN_EVIDENCE,
        tool_errors=len(errors),
        ignored_tool_error=ignored,
        # The agent looked at a red flag and still said "benign": the "rationalising away" failure.
        benign_despite_signal=strong_signals(tools) if concluded and verdict.verdict == "benign" else [],
    )
