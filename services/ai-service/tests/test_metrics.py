import math
from uuid import UUID

from app.eval.metrics import ndcg_at_k, precision_at_k

A, B, C, D, E = (UUID(int=i) for i in range(1, 6))


def test_precision_at_k() -> None:
    rel = {A: 2, C: 1}
    assert precision_at_k([A, B, C, D], rel, 4) == 0.5
    assert precision_at_k([B, D], rel, 5) == 0.0  # divides by k, not by len(results)


def test_ndcg_hand_worked_example() -> None:
    # Ranked: A(rel 2), B(rel 0), C(rel 1). Ideal order: A(2), C(1), then 0s.
    # DCG   = (2^2-1)/log2(2) + 0 + (2^1-1)/log2(4) = 3/1 + 0 + 1/2 = 3.5
    # IDCG  = 3/log2(2) + 1/log2(3)                  = 3 + 0.63093 = 3.63093
    # NDCG  = 3.5 / 3.63093 = 0.96394
    rel = {A: 2, C: 1}
    expected = 3.5 / (3 + 1 / math.log2(3))
    assert abs(ndcg_at_k([A, B, C], rel, 10) - expected) < 1e-9
    assert abs(expected - 0.96394) < 1e-4


def test_ndcg_perfect_and_empty() -> None:
    rel = {A: 2, B: 1}
    assert ndcg_at_k([A, B], rel, 10) == 1.0
    assert ndcg_at_k([A], {}, 10) == 0.0
