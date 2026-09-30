import math
from collections import defaultdict
from dataclasses import dataclass
from uuid import UUID

import asyncpg

from app.core.config import settings
from app.core.db import to_pgvector
from app.models.valuation import Comparable, ValuationStatus

MIN_COMPARABLES = 5
K = 20
# Keep neighbours within max(WINDOW_ABS, WINDOW_REL * d0) of the closest match d0,
# but never beyond the absolute ceiling (settings.valuation_max_distance).
WINDOW_ABS = 0.05
WINDOW_REL = 0.4
CATEGORY_VOTE_K = 10
CATEGORY_VOTE_MIN_SHARE = 0.6


@dataclass
class Candidate:
    id: UUID
    title: str
    owner_id: UUID
    category: str | None
    price: float
    distance: float


def trim_distance(cands: list[Candidate]) -> list[Candidate]:
    """Drop neighbours that are far from the query, in absolute terms and relative to the best match."""
    ordered = sorted((c for c in cands if c.distance <= settings.valuation_max_distance), key=lambda c: c.distance)
    if not ordered:
        return []
    d0 = ordered[0].distance
    ceiling = d0 + max(WINDOW_ABS, WINDOW_REL * d0)
    kept = [c for c in ordered if c.distance <= ceiling]
    # Widen (still under the absolute ceiling) rather than starve the statistics.
    return kept if len(kept) >= MIN_COMPARABLES else ordered[:MIN_COMPARABLES]


def _quantile(xs: list[float], q: float) -> float:
    xs = sorted(xs)
    pos = (len(xs) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def trim_price_outliers(cands: list[Candidate]) -> list[Candidate]:
    """Tukey fences in log-price space: prices are multiplicative, so a 10x item is an outlier
    even when its absolute distance to the median is 'small' next to a luxury tier."""
    if len(cands) < MIN_COMPARABLES:
        return cands
    logs = [math.log(max(c.price, 1.0)) for c in cands]
    q1, q3 = _quantile(logs, 0.25), _quantile(logs, 0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    kept = [c for c, lp in zip(cands, logs, strict=True) if lo <= lp <= hi]
    # Trimming must not push a usable set below the statistical minimum.
    return kept if len(kept) >= MIN_COMPARABLES else cands


def infer_category(neighbours: list[Candidate]) -> str | None:
    """Distance-weighted vote among the nearest neighbours; abstain if there's no clear winner."""
    weights: dict[str, float] = defaultdict(float)
    for c in neighbours[:CATEGORY_VOTE_K]:
        if c.category:
            weights[c.category] += 1.0 / (0.05 + c.distance)
    total = sum(weights.values())
    if not total:
        return None
    cat, w = max(weights.items(), key=lambda kv: kv[1])
    return cat if w / total >= CATEGORY_VOTE_MIN_SHARE else None


def classify(cands: list[Candidate]) -> ValuationStatus:
    if not cands:
        return "no_comparables"
    if len(cands) < MIN_COMPARABLES:
        return "insufficient_data"
    if len({c.owner_id for c in cands}) == 1:
        return "single_seller"
    return "ok"


async def fetch_neighbours(
    conn: asyncpg.Connection,
    qvec: list[float],
    model: str,
    *,
    category: str | None,
    sold_only: bool,
    exclude_id: UUID | None,
    limit: int,
) -> list[Candidate]:
    rows = await conn.fetch(
        """
        SELECT id, title, owner_id, category, current_price::float AS price,
               embedding <=> $1::vector AS distance
        FROM auctions
        WHERE status = 'ENDED'
          AND embedding IS NOT NULL AND embedding_model = $2
          AND (NOT $3 OR (highest_bidder_id IS NOT NULL AND current_price >= reserve_price))
          AND ($4::text IS NULL OR category = $4)
          AND ($5::uuid IS NULL OR id <> $5)
        ORDER BY embedding <=> $1::vector
        LIMIT $6
        """,
        to_pgvector(qvec),
        model,
        sold_only,
        category,
        exclude_id,
        limit,
    )
    return [
        Candidate(r["id"], r["title"], r["owner_id"], r["category"], float(r["price"]), float(r["distance"]))
        for r in rows
    ]


async def percentiles(conn: asyncpg.Connection, prices: list[float]) -> tuple[float, float, float]:
    row = await conn.fetchrow(
        """
        SELECT percentile_cont(ARRAY[0.25, 0.5, 0.75]) WITHIN GROUP (ORDER BY p) AS q
        FROM unnest($1::float8[]) AS p
        """,
        prices,
    )
    assert row is not None
    q = row["q"]
    return float(q[0]), float(q[1]), float(q[2])


@dataclass
class ValuationResult:
    status: ValuationStatus
    category: str | None
    comparables: list[Candidate]
    p25: float | None
    median: float | None
    p75: float | None


async def compute_valuation(
    conn: asyncpg.Connection,
    qvec: list[float],
    model: str,
    *,
    category: str | None = None,
    exclude_id: UUID | None = None,
) -> ValuationResult:
    chosen = category
    if chosen is None:
        probe = await fetch_neighbours(
            conn, qvec, model, category=None, sold_only=True, exclude_id=exclude_id, limit=CATEGORY_VOTE_K
        )
        chosen = infer_category(probe)

    cands = await fetch_neighbours(
        conn, qvec, model, category=chosen, sold_only=True, exclude_id=exclude_id, limit=K
    )
    cands = trim_price_outliers(trim_distance(cands))
    status = classify(cands)
    if status != "ok":
        return ValuationResult(status, chosen, cands, None, None, None)
    p25, med, p75 = await percentiles(conn, [c.price for c in cands])
    return ValuationResult("ok", chosen, cands, p25, med, p75)


def to_comparables(cands: list[Candidate], limit: int = 8) -> list[Comparable]:
    return [Comparable(id=c.id, title=c.title, price=c.price, distance=round(c.distance, 4)) for c in cands[:limit]]


def suggested_start(median: float) -> float:
    """Start at ~half the typical hammer price: low enough to attract bids, far enough above zero."""
    return max(100.0, round(median * 0.5 / 100) * 100)
