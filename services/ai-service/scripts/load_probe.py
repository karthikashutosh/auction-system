"""Drive each feature N times against a running service, then dump span + metric summaries.

    OTEL_ENABLED=true uvicorn app.main:app --port 8001 &
    PYTHONPATH=. uv run python scripts/load_probe.py
"""
import json
import random
from pathlib import Path

import httpx

BASE = "http://localhost:8001"
DATA = Path(__file__).resolve().parent.parent / "data"
QUERIES = ["vintage camera", "Canon AE-1", "dive watch", "wireless headphones", "solid wood table", "gold necklace",
           "laptop for coding", "vinyl turntable", "oil painting landscape", "mechanical keyboard", "star wars figure"]


def main() -> None:
    manifest = json.loads((DATA / "seed-manifest.json").read_text())
    rnd = random.Random(3)
    planted = [b for v in manifest["planted"].values() for b in v["bid_ids"]]
    with httpx.Client(base_url=BASE, timeout=60) as c:
        c.get("/debug/spans", params={"reset": True})
        for _ in range(60):
            c.post("/search", json={"query": rnd.choice(QUERIES), "mode": "hybrid", "limit": 10})
        for _ in range(20):
            c.post("/valuation", json={"title": rnd.choice(QUERIES).title(), "description": "Good condition, well kept item"})
        for b in rnd.sample(planted, 30):
            c.post("/fraud/score", json={"bid_id": b})
        for b in rnd.sample(planted, 15):
            c.post("/investigate", json={"bid_id": b})
        spans = c.get("/debug/spans").json()
        metrics = c.get("/metrics").json()
    print("SPANS (ms)")
    for name, s in sorted(spans.items(), key=lambda kv: -kv[1]["total_ms"]):
        print(f"  {name:32} n={s['count']:<5.0f} mean={s['mean_ms']:<8} p95={s['p95_ms']:<8} total={s['total_ms']}")
    print("METRICS", json.dumps(metrics, indent=1))
    (DATA / "probe.json").write_text(json.dumps({"spans": spans, "metrics": metrics}, indent=1))


main()
