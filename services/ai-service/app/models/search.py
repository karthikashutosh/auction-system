from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

SearchMode = Literal["vector", "lexical", "hybrid"]


class SearchRequest(BaseModel):
    query: str = Field(max_length=500)
    limit: int = Field(default=10, ge=1, le=50)
    offset: int = Field(default=0, ge=0, le=1000)
    mode: SearchMode = "hybrid"
    rrf_k: int = Field(default=60, ge=1, le=1000)


class SearchHit(BaseModel):
    id: UUID
    score: float
    distance: float | None = None
    vector_rank: int | None = None
    lexical_rank: int | None = None


class SearchResponse(BaseModel):
    hits: list[SearchHit]
    mode: SearchMode
    query: str
    total_candidates: int


class SimilarRequest(BaseModel):
    limit: int = Field(default=6, ge=1, le=30)


class SimilarResponse(BaseModel):
    hits: list[SearchHit]
