"""Days 52-53: run every planted pattern + normal controls through the agent, record cost/turns,
compare against a single-call baseline (detector score alone) and score the trajectories.

    PYTHONPATH=. uv run python scripts/eval_agent.py
"""
import asyncio
import json
import os
import random
from collections import Counter
from pathlib import Path
from statistics import mean
from uuid import UUID

from app.core.db import acquire, close_pool
from app.eval.trajectory import score_trajectory
from app.providers.base import ProviderError
from app.providers.chat_registry import chat
from app.services.agent import run_investigation
from app.services.fraud import features_for_bids, fit_baseline, score_features

DATA = Path(__file__).resolve().parent.parent / "data"


async def main() -> None:
    manifest = json.loads((DATA / "seed-manifest.json").read_text())
    seeded = {UUID(c["id"]) for c in manifest["catalog"]}
    async with acquire() as conn:
        rows = await features_for_bids(conn, None)
    baseline = fit_baseline([r.features for r in rows])
    by_bid = {r.bid_id: r for r in rows}
    scores = {r.bid_id: score_features(r.features, baseline) for r in rows}

    cases: list[tuple[str, UUID, bool]] = []  # (label, bid, is_fraud)
    rnd = random.Random(11)
    planted_bids: set[UUID] = set()
    for name, v in manifest["planted"].items():
        bids = [UUID(b) for b in v["bid_ids"]]
        planted_bids.update(bids)
        flagged = [b for b in bids if scores[b].flagged]
        for b in rnd.sample(flagged or bids, min(3, len(flagged or bids))):
            cases.append((name, b, True))
    normal = [r.bid_id for r in rows if r.auction_id in seeded and r.bid_id not in planted_bids]
    fp = [b for b in normal if scores[b].flagged]
    for b in fp[:4]:
        cases.append(("normal_false_positive", b, False))  # what a single call gets wrong
    for b in rnd.sample([n for n in normal if n not in fp], 8):
        cases.append(("normal_control", b, False))

    results = []
    for label, bid, fraud in cases:
        r = by_bid[bid]
        ctx = {
            "flagged_bid_id": str(bid), "user_id": str(r.user_id), "auction_id": str(r.auction_id),
            "detector_score": scores[bid].score, "detector_features": r.features,
        }
        verdict = None
        for attempt in range(4):  # provider quotas (free tiers) reset per minute: wait, then retry the case
            try:
                verdict, traj = await run_investigation(chat, context=ctx)
                break
            except ProviderError as exc:
                print(f"  provider error ({exc.status_code}), waiting 45s (attempt {attempt + 1}/4)")
                await asyncio.sleep(45)
        if verdict is None:
            results.append({"label": label, "is_fraud": fraud, "detector_flagged": scores[bid].flagged, "verdict": "error",
                            "confidence": 0.0, "turns": 0, "tool_calls": 0, "cost_usd": 0.0, "failures": ["provider_error"]})
            continue
        await asyncio.sleep(float(os.getenv("EVAL_CASE_DELAY_S", "6")))
        ts = score_trajectory(traj, verdict)
        with (DATA / "trajectories.jsonl").open("a") as f:
            f.write(json.dumps({"label": label, "verdict": verdict.model_dump(), "trajectory": traj}, default=str) + "\n")
        results.append({
            "label": label, "is_fraud": fraud, "detector_flagged": scores[bid].flagged,
            "verdict": verdict.verdict, "confidence": verdict.confidence, "turns": verdict.turns,
            "tool_calls": verdict.tool_calls, "cost_usd": verdict.cost_usd, "failures": ts.failures,
        })

    def correct_agent(x: dict[str, object]) -> bool:
        return (x["verdict"] == "suspicious") == x["is_fraud"] and x["verdict"] != "inconclusive"

    done_ = [r for r in results if r["verdict"] != "error"]
    out = {
        "provider": f"{chat.name}:{chat.model}",
        "cases": len(results),
        "errors": sum(r["verdict"] == "error" for r in results),
        "mean_turns": round(mean(r["turns"] for r in done_), 2),
        "mean_tool_calls": round(mean(r["tool_calls"] for r in done_), 2),
        "mean_cost_usd": round(mean(r["cost_usd"] for r in done_), 6),
        "single_call_detector_correct": sum(r["detector_flagged"] == r["is_fraud"] for r in results),
        "agent_correct": sum(correct_agent(r) for r in results),
        "agent_inconclusive": sum(r["verdict"] == "inconclusive" for r in results),
        "failure_modes": dict(Counter(f for r in results for f in r["failures"])),
        "per_case": results,
    }
    (DATA / "eval_agent.json").write_text(json.dumps(out, indent=2))
    print(json.dumps({k: v for k, v in out.items() if k != "per_case"}, indent=2))
    for r in results:
        print(f"{r['label']:36} det={r['detector_flagged']!s:5} agent={r['verdict']:12} conf={r['confidence']:.2f} turns={r['turns']}")
    await close_pool()


asyncio.run(main())
