from uuid import UUID

import asyncpg

from app.core.db import to_pgvector
from app.core.tracing import span
from app.models.search import SearchHit, SearchMode

CANDIDATES = 50


async def vector_search(
    conn: asyncpg.Connection, qvec: list[float], model: str, limit: int = CANDIDATES
) -> list[tuple[UUID, float]]:
    # Only rows embedded by the *current* model are comparable with this query vector.
    with span("retrieval.vector", limit=limit):
        rows = await _vector_rows(conn, qvec, model, limit)
    return [(r["id"], float(r["distance"])) for r in rows]


async def _vector_rows(conn: asyncpg.Connection, qvec: list[float], model: str, limit: int) -> list[asyncpg.Record]:
    rows: list[asyncpg.Record] = await conn.fetch(
        """
        SELECT id, embedding <=> $1::vector AS distance
        FROM auctions
        WHERE embedding IS NOT NULL AND embedding_model = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
        """,
        to_pgvector(qvec),
        model,
        limit,
    )
    return rows


async def lexical_search(
    conn: asyncpg.Connection, query: str, limit: int = CANDIDATES
) -> list[tuple[UUID, float]]:
    # websearch_to_tsquery never raises on user punctuation, unlike to_tsquery.
    with span("retrieval.lexical", limit=limit):
        rows = await _lexical_rows(conn, query, limit)
    return [(r["id"], float(r["rank"])) for r in rows]


async def _lexical_rows(conn: asyncpg.Connection, query: str, limit: int) -> list[asyncpg.Record]:
    rows: list[asyncpg.Record] = await conn.fetch(
        """
        SELECT a.id, ts_rank(a.search_tsv, q) AS rank
        FROM auctions a, websearch_to_tsquery('english', $1) q
        WHERE a.search_tsv @@ q
        ORDER BY rank DESC, a.id
        LIMIT $2
        """,
        query,
        limit,
    )
    return rows


def rrf_fuse(
    vector: list[tuple[UUID, float]],
    lexical: list[tuple[UUID, float]],
    k: int = 60,
) -> list[SearchHit]:
    """Reciprocal Rank Fusion: score(d) = sum over lists of 1 / (k + rank(d))."""
    scores: dict[UUID, float] = {}
    v_rank: dict[UUID, int] = {}
    l_rank: dict[UUID, int] = {}
    dist: dict[UUID, float] = {}
    for rank, (doc, d) in enumerate(vector, start=1):
        scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)
        v_rank[doc] = rank
        dist[doc] = d
    for rank, (doc, _) in enumerate(lexical, start=1):
        scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)
        l_rank[doc] = rank
    ordered = sorted(scores.items(), key=lambda kv: (-kv[1], str(kv[0])))
    return [
        SearchHit(id=doc, score=s, distance=dist.get(doc), vector_rank=v_rank.get(doc), lexical_rank=l_rank.get(doc))
        for doc, s in ordered
    ]


def _vector_only(vector: list[tuple[UUID, float]]) -> list[SearchHit]:
    return [
        SearchHit(id=doc, score=1.0 - d, distance=d, vector_rank=i)
        for i, (doc, d) in enumerate(vector, start=1)
    ]


def _lexical_only(lexical: list[tuple[UUID, float]]) -> list[SearchHit]:
    return [SearchHit(id=doc, score=s, lexical_rank=i) for i, (doc, s) in enumerate(lexical, start=1)]


async def run_search(
    conn: asyncpg.Connection,
    *,
    mode: SearchMode,
    query: str,
    qvec: list[float] | None,
    model: str,
    rrf_k: int = 60,
) -> list[SearchHit]:
    vector: list[tuple[UUID, float]] = []
    lexical: list[tuple[UUID, float]] = []
    if mode in ("vector", "hybrid") and qvec is not None:
        vector = await vector_search(conn, qvec, model)
    if mode in ("lexical", "hybrid"):
        lexical = await lexical_search(conn, query)
    if mode == "vector":
        return _vector_only(vector)
    if mode == "lexical":
        return _lexical_only(lexical)
    return rrf_fuse(vector, lexical, rrf_k)


async def similar_to(
    conn: asyncpg.Connection, auction_id: UUID, model: str, limit: int
) -> list[SearchHit]:
    rows = await conn.fetch(
        """
        SELECT b.id, b.embedding <=> a.embedding AS distance
        FROM auctions a
        JOIN LATERAL (
            SELECT id, embedding FROM auctions
            WHERE id <> a.id AND embedding IS NOT NULL AND embedding_model = $2
            ORDER BY embedding <=> a.embedding
            LIMIT $3
        ) b ON true
        WHERE a.id = $1 AND a.embedding IS NOT NULL AND a.embedding_model = $2
        ORDER BY distance
        """,
        auction_id,
        model,
        limit,
    )
    return _vector_only([(r["id"], float(r["distance"])) for r in rows])
