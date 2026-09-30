"""Build data/golden.json from *label rules over the seeded corpus*.

Labels come from structured facts about each listing (brand/model/category/era/
price), never from what the retrieval system returns. Grades: 2 = clearly what
the query wants, 1 = acceptable/related, 0 = not relevant (omitted).
"""
import asyncio
import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

import asyncpg

from app.core.config import settings

Row = dict[str, Any]
Rule = Callable[[Row], int]
DATA = Path(__file__).resolve().parent.parent / "data"


def has(*words: str) -> Callable[[Row], bool]:
    return lambda r: any(w in (r["title"] + " " + r["description"]).lower() for w in words)


def model(brand_model: str) -> Rule:
    return lambda r: 2 if brand_model.lower() in r["title"].lower() else 0


def era_before(year: int) -> Callable[[Row], bool]:
    def f(r: Row) -> bool:
        m = re.search(r"Dates from the (\d{4})s", r["description"])
        return bool(m and int(m.group(1)) < year)

    return f


QUERIES: list[tuple[str, str, Rule]] = [
    # --- exact term
    ("Canon AE-1", "exact", model("Canon AE-1")),
    ("Technics SL-1200", "exact", model("Technics SL-1200")),
    ("Rolex Submariner 5513", "exact", model("Rolex Submariner")),
    ("Keychron Q1", "exact", model("Keychron Q1")),
    ("Leica M3", "exact", model("Leica M3")),
    ("RTX 3080", "exact", model("RTX 3080")),
    ("Marantz 2270", "exact", model("Marantz 2270")),
    # --- semantic
    ("camera for film photography", "semantic",
     lambda r: 2 if r["category"] == "cameras" and has("film")(r) else (1 if r["category"] == "cameras" else 0)),
    ("listen to vinyl records", "semantic",
     lambda r: 2 if has("turntable", "vinyl")(r) and r["category"] in ("audio", "collectibles") else (1 if has("receiver", "amplifier")(r) else 0)),
    ("wireless headphones with noise cancelling", "semantic",
     lambda r: 2 if "WH-1000XM4" in r["title"] else (1 if "headphones" in r["title"].lower() else 0)),
    ("solid wood furniture for the dining room", "semantic",
     lambda r: 2 if "dining table" in r["title"].lower() else (1 if r["category"] == "furniture" and has("teak", "oak", "mahogany", "rosewood")(r) else 0)),
    ("gold jewellery for a wedding", "semantic",
     lambda r: 2 if r["category"] == "jewelry" and has("wedding", "bridal", "engagement")(r) else (1 if r["category"] == "jewelry" and has("gold")(r) else 0)),
    ("dive watch", "semantic",
     lambda r: 2 if r["category"] == "watches" and has("dive")(r) else (1 if r["category"] == "watches" else 0)),
    ("laptop for programming", "semantic",
     lambda r: 2 if r["category"] == "computers" and has("laptop")(r) else (1 if r["category"] == "computers" and has("keyboard", "monitor")(r) else 0)),
    ("mechanical keyboard for typing", "semantic",
     lambda r: 2 if "mechanical keyboard" in r["title"].lower() else (1 if r["category"] == "computers" and has("mouse")(r) else 0)),
    # --- vague
    ("something for a gift", "vague",
     lambda r: 2 if r["category"] == "jewelry" else (1 if r["category"] in ("collectibles", "watches") else 0)),
    ("old and rare things", "vague",
     lambda r: 2 if era_before(1961)(r) and r["category"] in ("collectibles", "cameras", "watches") else (1 if era_before(1981)(r) else 0)),
    ("something to decorate my living room wall", "vague",
     lambda r: 2 if r["category"] == "art" else 0),
    ("sound system for a party", "vague",
     lambda r: 2 if r["category"] == "audio" and has("speakers", "receiver", "turntable")(r) else (1 if r["category"] == "audio" else 0)),
    ("cheap starter gear", "vague",
     lambda r: 1 if r["current_price"] <= 8000 and "For parts" not in r["title"] else 0),
]


async def main() -> None:
    conn = await asyncpg.connect(settings.database_url)
    rows = [dict(r) for r in await conn.fetch(
        "SELECT id, title, description, category, current_price::float AS current_price FROM auctions WHERE category IS NOT NULL")]
    await conn.close()
    golden = []
    for q, kind, rule in QUERIES:
        rel = {str(r["id"]): g for r in rows if (g := rule(r)) > 0}
        assert any(g == 2 for g in rel.values()) or kind == "vague", f"no strong positives for {q!r}"
        golden.append({"query": q, "type": kind, "relevant": rel})
    (DATA / "golden.json").write_text(json.dumps(golden, indent=1))
    for g in golden:
        print(f"{g['type']:8} {len(g['relevant']):4} relevant  {g['query']}")


asyncio.run(main())
