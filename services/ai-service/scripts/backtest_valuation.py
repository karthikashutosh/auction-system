"""Hide the final price of held-out sold auctions, run valuation as if new, measure the hit rate.

    PYTHONPATH=. uv run python scripts/backtest_valuation.py [N]
"""
import asyncio
import json
import random
import sys
from pathlib import Path

from app.core.db import acquire, close_pool
from app.providers.registry import embedder
from app.services.valuation import compute_valuation


def parse_vec(s: str) -> list[float]:
    return [float(x) for x in s.strip("[]").split(",")]


async def main(n: int) -> None:
    async with acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, current_price::float AS price, embedding::text AS emb
               FROM auctions WHERE status='ENDED' AND embedding IS NOT NULL AND embedding_model=$1
                 AND highest_bidder_id IS NOT NULL AND current_price >= reserve_price""",
            embedder.model,
        )
        rows = sorted(rows, key=lambda r: str(r["id"]))  # stable order -> reproducible sample
        random.Random(7).shuffle(rows)
        sample = rows[:n]
        hits = covered = 0
        abs_pct: list[float] = []
        by_status: dict[str, int] = {}
        for r in sample:
            res = await compute_valuation(conn, parse_vec(r["emb"]), embedder.model, exclude_id=r["id"])
            by_status[res.status] = by_status.get(res.status, 0) + 1
            if res.status != "ok" or res.p25 is None or res.p75 is None or res.median is None:
                continue
            covered += 1
            hits += res.p25 <= r["price"] <= res.p75
            abs_pct.append(abs(res.median - r["price"]) / r["price"])
    out = {
        "provider": f"{embedder.name}:{embedder.model}",
        "held_out": len(sample),
        "with_range": covered,
        "hit_rate_p25_p75": round(hits / covered, 4) if covered else None,
        "median_abs_pct_error": round(sorted(abs_pct)[len(abs_pct) // 2], 4) if abs_pct else None,
        "by_status": by_status,
    }
    print(json.dumps(out, indent=2))
    Path(__file__).resolve().parent.parent.joinpath("data/backtest_valuation.json").write_text(json.dumps(out, indent=2))
    await close_pool()


asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 100))
