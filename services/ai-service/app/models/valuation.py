from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ValuationStatus = Literal["ok", "insufficient_data", "no_comparables", "single_seller"]


class ValuationRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    category: str | None = Field(default=None, max_length=50)


class Comparable(BaseModel):
    id: UUID
    title: str
    price: float
    distance: float


class Explanation(BaseModel):
    """The only thing an LLM is asked to produce in valuation: one sentence."""

    sentence: str = Field(min_length=10, max_length=320)


class ValuationResponse(BaseModel):
    status: ValuationStatus
    category: str | None
    n: int
    p25: float | None
    median: float | None
    p75: float | None
    comparables: list[Comparable]
    explanation: str | None
    suggested_starting_price: float | None
