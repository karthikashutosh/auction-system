"""Score every seeded bid; report detection on planted patterns and the false-positive rate.

    PYTHONPATH=. uv run python scripts/eval_fraud.py
"""
import asyncio
import json
from pathlib import Path
from uuid import UUID

from app.core.db import acquire, close_pool
from app.services.fraud import features_for_bids, fit_baseline, score_features

DATA = Path(__file__).resolve().parent.parent / "data"


async def main() -> None:
    manifest = json.loads((DATA / "seed-manifest.json").read_text())
    planted = {p: {UUID(b) for b in v["bid_ids"]} for p, v in manifest["planted"].items()}
    all_planted = set().union(*planted.values())
    seeded_auctions = {UUID(c["id"]) for c in manifest["catalog"]}
    async with acquire() as conn:
        rows = await features_for_bids(conn, None)
    baseline = fit_baseline([r.features for r in rows])
    # The dev DB also holds hand-made test bids (rapid, one seller, new accounts...) that
    # legitimately look suspicious. The baseline is fit on everything (as in production);
    # detection / false-positive rates are measured on the seeded corpus only.
    scored = {r.bid_id: score_features(r.features, baseline) for r in rows if r.auction_id in seeded_auctions}
    non_seed_flagged = sum(score_features(r.features, baseline).flagged for r in rows if r.auction_id not in seeded_auctions)

    per_pattern = {}
    for name, bids in planted.items():
        flagged = [b for b in bids if scored[b].flagged]
        per_pattern[name] = {
            "bids": len(bids),
            "flagged": len(flagged),
            "recall": round(len(flagged) / len(bids), 3),
            "caught": bool(flagged),
        }
    normal = [b for b in scored if b not in all_planted]
    fp = [b for b in normal if scored[b].flagged]
    days = 120  # seed window
    out = {
        "baseline": {"median": baseline.median, "scale": baseline.scale},
        "total_bids_scored": len(scored),
        "non_seed_dev_bids_flagged": non_seed_flagged,
        "patterns": per_pattern,
        "patterns_caught": f"{sum(v['caught'] for v in per_pattern.values())}/{len(per_pattern)}",
        "planted_bid_recall": round(sum(scored[b].flagged for b in all_planted) / len(all_planted), 3),
        "normal_bids": len(normal),
        "false_positives": len(fp),
        "false_positive_rate": round(len(fp) / len(normal), 5),
        "flags_per_day_incl_planted": round(sum(s.flagged for s in scored.values()) / days, 3),
        "flags_per_day_normal_only": round(len(fp) / days, 3),
    }
    print(json.dumps(out, indent=2))
    (DATA / "eval_fraud.json").write_text(json.dumps(out, indent=2))
    await close_pool()


asyncio.run(main())
