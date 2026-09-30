from uuid import UUID

from app.services.search import rrf_fuse

A, B, C, D = (UUID(int=i) for i in (1, 2, 3, 4))


def test_rrf_rewards_agreement() -> None:
    hits = rrf_fuse([(A, 0.1), (B, 0.2), (C, 0.3)], [(B, 5.0), (D, 4.0), (A, 3.0)], k=60)
    assert [h.id for h in hits][:2] == [B, A]
    top = hits[0]
    assert abs(top.score - (1 / 62 + 1 / 61)) < 1e-12
    assert top.vector_rank == 2 and top.lexical_rank == 1


def test_rrf_single_list_preserves_order() -> None:
    hits = rrf_fuse([(A, 0.1), (B, 0.2)], [], k=60)
    assert [h.id for h in hits] == [A, B]
