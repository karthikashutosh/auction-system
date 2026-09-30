"""Run the golden set against search modes.

    PYTHONPATH=. uv run python -m app.eval.run_eval --modes vector,hybrid
"""
import argparse
import asyncio
import json
from pathlib import Path
from statistics import mean
from typing import Any
from uuid import UUID

from app.core.db import acquire, close_pool
from app.eval.metrics import ndcg_at_k, precision_at_k
from app.models.search import SearchMode
from app.providers.registry import embedder
from app.services.search import run_search

DATA = Path(__file__).resolve().parent.parent.parent / "data"


async def evaluate(mode: SearchMode, rrf_k: int = 60) -> dict[str, Any]:
    golden = json.loads((DATA / "golden.json").read_text())
    per_query: list[dict[str, Any]] = []
    async with acquire() as conn:
        for g in golden:
            emb = await embedder.embed([g["query"]], feature="eval", input_type="query")
            hits = await run_search(
                conn, mode=mode, query=g["query"], qvec=emb.vectors[0], model=embedder.model, rrf_k=rrf_k
            )
            ranked = [h.id for h in hits]
            rel = {UUID(k): int(v) for k, v in g["relevant"].items()}
            per_query.append(
                {
                    "query": g["query"],
                    "type": g["type"],
                    "p@5": precision_at_k(ranked, rel, 5),
                    "p@10": precision_at_k(ranked, rel, 10),
                    "ndcg@10": ndcg_at_k(ranked, rel, 10),
                }
            )

    def agg(rows: list[dict[str, Any]]) -> dict[str, float]:
        return {m: round(mean(r[m] for r in rows), 4) for m in ("p@5", "p@10", "ndcg@10")}

    by_type = {t: agg([r for r in per_query if r["type"] == t]) for t in sorted({r["type"] for r in per_query})}
    return {
        "provider": f"{embedder.name}:{embedder.model}",
        "mode": mode,
        "queries": len(per_query),
        "overall": agg(per_query),
        "by_type": by_type,
        "per_query": per_query,
    }


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--modes", default="vector,lexical,hybrid")
    args = ap.parse_args()
    results = []
    for mode in args.modes.split(","):
        results.append(await evaluate(mode))
    for r in results:
        print(f"\n{r['provider']}  mode={r['mode']}  n={r['queries']}")
        print("  overall", r["overall"])
        for t, v in r["by_type"].items():
            print(f"  {t:9}", v)
    out = DATA / f"eval_{embedder.name}.json"
    out.write_text(json.dumps(results, indent=1))
    print("\nwrote", out)
    await close_pool()


if __name__ == "__main__":
    asyncio.run(main())
