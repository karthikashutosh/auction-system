from fastapi import APIRouter

from app.core.db import acquire
from app.core.tracing import span
from app.models.valuation import ValuationRequest, ValuationResponse
from app.providers.chat_registry import chat
from app.providers.registry import embedder
from app.services.explain import explain
from app.services.valuation import compute_valuation, suggested_start, to_comparables

router = APIRouter(tags=["valuation"])


@router.post("/valuation", response_model=ValuationResponse)
async def valuation(req: ValuationRequest) -> ValuationResponse:
    """Comparables valuation. Statistics are computed in SQL/Python; the LLM only phrases the result."""
    emb = await embedder.embed([f"{req.title}\n{req.description}"], feature="valuation_embed", input_type="query")
    with span("retrieval.valuation"):
        async with acquire() as conn:
            res = await compute_valuation(conn, emb.vectors[0], embedder.model, category=req.category)
    sentence = await explain(chat, res)
    return ValuationResponse(
        status=res.status,
        category=res.category,
        n=len(res.comparables),
        p25=res.p25,
        median=res.median,
        p75=res.p75,
        comparables=to_comparables(res.comparables),
        explanation=sentence,
        suggested_starting_price=suggested_start(res.median) if res.median else None,
    )
