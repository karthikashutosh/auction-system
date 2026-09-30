from app.eval.trajectory import score_trajectory
from app.models.agent import Verdict


def verdict(**kw: object) -> Verdict:
    base: dict[str, object] = dict(investigation_id="x", verdict="suspicious", confidence=0.8, evidence=["a", "b"], reasoning="r", turns=3, tool_calls=2, cost_usd=0.0)
    return Verdict(**{**base, **kw})  # type: ignore[arg-type]


def step(kind: str, tool: str | None = None, args: object = None, error: bool = False) -> dict[str, object]:
    return {"kind": kind, "tool": tool, "args": args, "error": error}


def test_clean_trajectory_has_no_failures() -> None:
    traj = [step("llm"), step("tool", "a", {"x": 1}), step("llm"), step("tool", "b", {"x": 1}), step("llm")]
    assert score_trajectory(traj, verdict()).failures == []


def test_redundant_and_no_lookup_and_low_evidence() -> None:
    assert score_trajectory([step("llm"), step("tool", "a", {"x": 1}), step("tool", "a", {"x": 1})], verdict()).redundant_calls == 1
    s = score_trajectory([step("llm")], verdict(evidence=[]))
    assert "concluded_turn1_no_lookups" in s.failures and "terminated_below_evidence_threshold" in s.failures


def test_too_many_turns_and_ignored_errors() -> None:
    traj = [step("llm")] * 8 + [step("tool", "a", {}, error=True)]
    s = score_trajectory(traj, verdict(confidence=0.9))
    assert "too_many_turns" in s.failures and "ignored_tool_error" in s.failures


def test_benign_despite_strong_signal_is_flagged() -> None:
    traj = [
        step("llm"),
        {"kind": "tool", "tool": "getAccountMetadata", "args": {"user_id": "u"}, "result_summary": "account age 725.4h (first bid at 2.0h), 15 bids"},
        {"kind": "tool", "tool": "getBidderHistory", "args": {"user_id": "u"}, "result_summary": "24 bids, 1 sellers, top seller share 1.0"},
    ]
    s = score_trajectory(traj, verdict(verdict="benign", evidence=["a", "b"]))
    assert "benign_despite_strong_signal" in s.failures and len(s.benign_despite_signal) == 2
    assert not score_trajectory(traj, verdict(verdict="suspicious")).benign_despite_signal


def test_no_false_alarm_on_ordinary_account() -> None:
    traj = [
        {"kind": "tool", "tool": "getAccountMetadata", "args": {}, "result_summary": "account age 9000.0h (first bid at 7000.0h), 40 bids"},
        {"kind": "tool", "tool": "getBidderHistory", "args": {}, "result_summary": "40 bids, 9 sellers, top seller share 0.2"},
    ]
    assert score_trajectory(traj, verdict(verdict="benign")).benign_despite_signal == []
