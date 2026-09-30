from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

VerdictLabel = Literal["suspicious", "benign", "inconclusive"]


# ---------- tool inputs ----------
class BidderHistoryInput(BaseModel):
    user_id: UUID


class SellerAuctionsInput(BaseModel):
    seller_id: UUID


class BidTimelineInput(BaseModel):
    auction_id: UUID


class AccountMetadataInput(BaseModel):
    user_id: UUID


# ---------- tool outputs ----------
class ToolError(BaseModel):
    """Structured failure the model can read and adapt to (tools never raise into the loop)."""

    ok: Literal[False] = False
    code: Literal["not_found", "invalid_argument", "unavailable", "internal"]
    message: str
    retryable: bool = False


class BidRecord(BaseModel):
    auction_id: UUID
    seller_id: UUID
    amount: float
    at: datetime


class BidderHistory(BaseModel):
    ok: Literal[True] = True
    user_id: UUID
    total_bids: int
    distinct_auctions: int
    distinct_sellers: int
    top_seller_id: UUID | None
    top_seller_share: float
    recent_bids: list[BidRecord]


class SellerAuctionSummary(BaseModel):
    auction_id: UUID
    title: str
    status: str
    final_price: float
    bid_count: int
    distinct_bidders: int
    top_bidder_id: UUID | None
    top_bidder_share: float


class SellerAuctions(BaseModel):
    ok: Literal[True] = True
    seller_id: UUID
    auction_count: int
    auctions: list[SellerAuctionSummary]


class TimelineBid(BaseModel):
    bid_id: UUID
    user_id: UUID
    amount: float
    at: datetime
    seconds_since_previous: float | None
    seconds_before_close: float


class BidTimeline(BaseModel):
    ok: Literal[True] = True
    auction_id: UUID
    bid_count: int
    bids: list[TimelineBid]


class AccountMetadata(BaseModel):
    ok: Literal[True] = True
    user_id: UUID
    name: str
    role: str
    created_at: datetime
    age_hours_now: float
    age_hours_at_first_bid: float | None
    total_bids: int
    auctions_owned: int


# ---------- verdict ----------
class VerdictDraft(BaseModel):
    """What the model must emit as its final message."""

    verdict: VerdictLabel
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = Field(max_length=12)
    reasoning: str = Field(min_length=1, max_length=2000)


class VerificationResult(BaseModel):
    supported: bool
    reason: str = ""


class InvestigationRequest(BaseModel):
    bid_id: UUID
    score: float = 0.0
    features: dict[str, float] = Field(default_factory=dict)


class Verdict(BaseModel):
    investigation_id: str
    verdict: VerdictLabel
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[str]
    reasoning: str
    turns: int
    tool_calls: int
    cost_usd: float
    aborted_reason: Literal["max_turns", "cost_ceiling", "stuck_loop"] | None = None
    verification: Literal["supported", "downgraded", "skipped"] = "skipped"
