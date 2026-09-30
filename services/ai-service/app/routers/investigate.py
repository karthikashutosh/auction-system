from fastapi import APIRouter, HTTPException

from app.core.db import acquire
from app.models.agent import InvestigationRequest, Verdict
from app.providers.chat_registry import chat
from app.services.agent import run_investigation

router = APIRouter(tags=["agent"])


@router.post("/investigate", response_model=Verdict)
async def investigate(req: InvestigationRequest) -> Verdict:
    """Runs the investigation and RETURNS the verdict. Node persists it (Python never writes)."""
    async with acquire() as conn:
        bid = await conn.fetchrow(
            "SELECT id, user_id, auction_id, amount::float AS amount, created_at FROM bids WHERE id = $1", req.bid_id
        )
    if bid is None:
        raise HTTPException(status_code=404, detail="bid not found")
    context = {
        "flagged_bid_id": str(bid["id"]),
        "user_id": str(bid["user_id"]),
        "auction_id": str(bid["auction_id"]),
        "bid_amount": bid["amount"],
        "bid_time": bid["created_at"].isoformat(),
        "detector_score": req.score,
        "detector_features": req.features,
    }
    verdict, _ = await run_investigation(chat, context=context)
    return verdict
