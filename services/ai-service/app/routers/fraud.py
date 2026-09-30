from fastapi import APIRouter, HTTPException

from app.core.db import acquire
from app.models.fraud import FraudScoreRequest, FraudScoreResponse
from app.services.fraud import features_for_bids, get_baseline, score_features

router = APIRouter(prefix="/fraud", tags=["fraud"])


@router.post("/score", response_model=FraudScoreResponse)
async def score_bid(req: FraudScoreRequest) -> FraudScoreResponse:
    """Read-only scoring. Node decides whether to persist a flag."""
    async with acquire() as conn:
        rows = await features_for_bids(conn, [req.bid_id])
        if not rows:
            raise HTTPException(status_code=404, detail="bid not found")
        baseline = await get_baseline(conn)
    row = rows[0]
    result = score_features(row.features, baseline)
    return FraudScoreResponse(
        bid_id=row.bid_id,
        auction_id=row.auction_id,
        user_id=row.user_id,
        score=result.score,
        flagged=result.flagged,
        features={k: round(v, 4) for k, v in row.features.items()},
        contributions=result.contributions,
    )
