import re
from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.core.db import acquire
from app.models.search import (
    SearchRequest,
    SearchResponse,
    SimilarRequest,
    SimilarResponse,
)
from app.providers.registry import embedder
from app.services.search import run_search, similar_to

router = APIRouter(tags=["search"])
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


@router.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest) -> SearchResponse:
    """Returns ranked IDs + scores only. Node hydrates full records."""
    query = " ".join(_CONTROL.sub(" ", req.query).split())  # NUL etc. would crash Postgres text params
    if not query:
        return SearchResponse(hits=[], mode=req.mode, query="", total_candidates=0)

    qvec: list[float] | None = None
    if req.mode in ("vector", "hybrid"):
        emb = await embedder.embed([query], feature="search", input_type="query")
        qvec = emb.vectors[0]

    async with acquire() as conn:
        hits = await run_search(
            conn, mode=req.mode, query=query, qvec=qvec, model=embedder.model, rrf_k=req.rrf_k
        )
    page = hits[req.offset : req.offset + req.limit]
    return SearchResponse(hits=page, mode=req.mode, query=query, total_candidates=len(hits))


@router.post("/similar/{auction_id}", response_model=SimilarResponse)
async def similar(auction_id: UUID, req: SimilarRequest) -> SimilarResponse:
    async with acquire() as conn:
        hits = await similar_to(conn, auction_id, embedder.model, req.limit)
    if not hits:
        raise HTTPException(status_code=404, detail="auction has no embedding or no neighbours")
    return SimilarResponse(hits=hits)
