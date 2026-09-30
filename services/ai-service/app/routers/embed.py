from fastapi import APIRouter

from app.models.embed import (
    EmbedBatchRequest,
    EmbedBatchResponse,
    EmbedRequest,
    EmbedResponse,
)
from app.providers.registry import embedder

router = APIRouter(tags=["embed"])


@router.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest) -> EmbedResponse:
    """Pure compute: text in, vector out. Never touches Postgres; Node writes the vector."""
    result = await embedder.embed([req.text], feature=req.feature)
    return EmbedResponse(
        embedding=result.vectors[0],
        provider=embedder.name,
        model=embedder.model,
        dimensions=embedder.dimensions,
        tokens=result.tokens,
    )


@router.post("/embed/batch", response_model=EmbedBatchResponse)
async def embed_batch(req: EmbedBatchRequest) -> EmbedBatchResponse:
    result = await embedder.embed(req.texts, feature=req.feature)
    return EmbedBatchResponse(
        embeddings=result.vectors,
        provider=embedder.name,
        model=embedder.model,
        dimensions=embedder.dimensions,
        tokens=result.tokens,
    )
