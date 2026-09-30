"""Statistical bid scoring: robust z-scores per feature, combined into one 0..1 score.

Features (all derivable for any bid from the existing schema):
  velocity       bids by this account in the 60s ending at this bid
  account_age    log1p(hours between account creation and this bid)      (low = risky)
  concentration  share of the account's bids so far on this bid's seller (high = risky;
                 only defined once the account has >= MIN_BIDS_FOR_CONCENTRATION bids)
  proximity      log1p(seconds between this bid and auction close)       (low = risky)

Why robust z (median/MAD) rather than mean/stddev or IQR fences:
  a planted bot inflates the mean and stddev of the very distribution it is judged against
  ("masking"), while median and MAD barely move. IQR fences give only in/out, and we want a
  continuous score we can add across features and explain per feature.
"""
import asyncio
import logging
import math
import statistics
import time
from dataclasses import dataclass
from uuid import UUID

import asyncpg

FEATURES = ("velocity", "account_age", "concentration", "proximity")
MIN_BIDS_FOR_CONCENTRATION = 8
Z_CAP = 6.0
SCORE_SCALE = 8.0  # score = 1 - exp(-raw / SCORE_SCALE); raw=SCORE_SCALE*ln2 -> 0.5
FLAG_THRESHOLD = 0.5
# direction: +1 = high value is suspicious, -1 = low value is suspicious
DIRECTION = {"velocity": 1.0, "account_age": -1.0, "concentration": 1.0, "proximity": -1.0}
WEIGHT = {"velocity": 1.0, "account_age": 1.0, "concentration": 1.0, "proximity": 0.5}
# Floors keep a very tight MAD (e.g. velocity: almost every bid is 1) from turning
# ordinary variation into huge z-scores. Age/proximity are log-scaled: 1.5 ~ "a factor of 4.5".
SCALE_FLOOR = {"velocity": 0.5, "account_age": 1.5, "concentration": 0.1, "proximity": 1.5}


@dataclass(frozen=True)
class Baseline:
    median: dict[str, float]
    scale: dict[str, float]  # 1.4826 * MAD, floored


@dataclass(frozen=True)
class ScoreResult:
    score: float
    flagged: bool
    contributions: dict[str, float]


def make_features(
    *, bids_last_60s: float, account_age_hours: float, same_seller_bids: float, total_bids: float, secs_to_close: float
) -> dict[str, float]:
    conc = same_seller_bids / total_bids if total_bids >= MIN_BIDS_FOR_CONCENTRATION else 0.0
    return {
        "velocity": bids_last_60s,
        "account_age": math.log1p(max(account_age_hours, 0.0)),
        "concentration": conc,
        "proximity": math.log1p(max(secs_to_close, 0.0)),
    }


def fit_baseline(rows: list[dict[str, float]]) -> Baseline:
    med: dict[str, float] = {}
    scale: dict[str, float] = {}
    for f in FEATURES:
        xs = [r[f] for r in rows]
        m = statistics.median(xs)
        mad = statistics.median(abs(x - m) for x in xs)
        med[f] = m
        scale[f] = max(1.4826 * mad, SCALE_FLOOR[f])
    return Baseline(med, scale)


def score_features(features: dict[str, float], baseline: Baseline) -> ScoreResult:
    """Pure: feature dict + baseline in, score and per-feature contributions out."""
    contributions: dict[str, float] = {}
    for f in FEATURES:
        z = DIRECTION[f] * (features[f] - baseline.median[f]) / baseline.scale[f]
        contributions[f] = WEIGHT[f] * min(max(z, 0.0), Z_CAP)
    raw = sum(contributions.values())
    score = 1.0 - math.exp(-raw / SCORE_SCALE)
    return ScoreResult(round(score, 4), score >= FLAG_THRESHOLD, {k: round(v, 3) for k, v in contributions.items()})


FEATURE_SQL = """
SELECT b.id AS bid_id, b.auction_id, b.user_id, b.created_at,
  (SELECT count(*) FROM bids x
     WHERE x.user_id = b.user_id
       AND x.created_at >  b.created_at - interval '60 seconds'
       AND x.created_at <= b.created_at)::float8 AS bids_last_60s,
  (EXTRACT(EPOCH FROM (b.created_at - u.created_at)) / 3600.0)::float8 AS account_age_hours,
  c.same::float8 AS same_seller_bids, c.total::float8 AS total_bids,
  EXTRACT(EPOCH FROM (a.end_time - b.created_at))::float8 AS secs_to_close
FROM bids b
JOIN users u ON u.id = b.user_id
JOIN auctions a ON a.id = b.auction_id
CROSS JOIN LATERAL (
  SELECT count(*) FILTER (WHERE a2.owner_id = a.owner_id) AS same, count(*) AS total
  FROM bids x JOIN auctions a2 ON a2.id = x.auction_id
  WHERE x.user_id = b.user_id AND x.created_at <= b.created_at
) c
WHERE ($1::uuid[] IS NULL OR b.id = ANY($1::uuid[]))
"""


@dataclass
class BidFeatures:
    bid_id: UUID
    auction_id: UUID
    user_id: UUID
    features: dict[str, float]


async def features_for_bids(conn: asyncpg.Connection, bid_ids: list[UUID] | None) -> list[BidFeatures]:
    rows = await conn.fetch(FEATURE_SQL, bid_ids)
    return [
        BidFeatures(
            r["bid_id"],
            r["auction_id"],
            r["user_id"],
            make_features(
                bids_last_60s=r["bids_last_60s"],
                account_age_hours=r["account_age_hours"],
                same_seller_bids=r["same_seller_bids"],
                total_bids=r["total_bids"],
                secs_to_close=r["secs_to_close"],
            ),
        )
        for r in rows
    ]


_cache: tuple[float, Baseline] | None = None
_refreshing = False
BASELINE_TTL_S = 600.0
_DEFAULT = Baseline(
    {"velocity": 1, "account_age": 8, "concentration": 0.1, "proximity": 10},
    dict(SCALE_FLOOR),
)


async def refresh_baseline(conn: asyncpg.Connection) -> Baseline:
    """Fits the baseline over every bid (a full-table feature scan: ~hundreds of ms)."""
    global _cache
    all_rows = await features_for_bids(conn, None)
    baseline = fit_baseline([r.features for r in all_rows]) if all_rows else _DEFAULT
    _cache = (time.monotonic(), baseline)
    return baseline


async def _refresh_in_background() -> None:
    global _refreshing
    from app.core.db import acquire

    try:
        async with acquire() as conn:
            await refresh_baseline(conn)
    except Exception:  # noqa: BLE001 - keep serving the stale baseline
        logging.getLogger("fraud").warning("baseline refresh failed; serving stale baseline", exc_info=True)
    finally:
        _refreshing = False


async def get_baseline(conn: asyncpg.Connection) -> Baseline:
    """Stale-while-revalidate: never make a bid-scoring request pay for the full scan
    once a baseline exists (traces showed the first call after each TTL was ~30x slower)."""
    global _refreshing
    if _cache is None:
        return await refresh_baseline(conn)
    if time.monotonic() - _cache[0] >= BASELINE_TTL_S and not _refreshing:
        _refreshing = True
        asyncio.get_running_loop().create_task(_refresh_in_background())
    return _cache[1]


def reset_baseline_cache() -> None:
    global _cache
    _cache = None
