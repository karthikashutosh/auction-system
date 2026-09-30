from uuid import UUID

from pydantic import BaseModel


class FraudScoreRequest(BaseModel):
    bid_id: UUID


class FraudScoreResponse(BaseModel):
    bid_id: UUID
    auction_id: UUID
    user_id: UUID
    score: float
    flagged: bool
    features: dict[str, float]
    contributions: dict[str, float]
