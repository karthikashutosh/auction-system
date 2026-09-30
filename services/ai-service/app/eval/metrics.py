import math
from collections.abc import Mapping, Sequence
from uuid import UUID


def precision_at_k(ranked: Sequence[UUID], relevant: Mapping[UUID, int], k: int) -> float:
    """Fraction of the top-k results with grade >= 1. Divides by k even if fewer results returned."""
    top = ranked[:k]
    return sum(1 for d in top if relevant.get(d, 0) >= 1) / k


def dcg_at_k(grades: Sequence[int], k: int) -> float:
    """DCG with exponential gain: sum (2^rel - 1) / log2(i + 1), i starting at 1."""
    return float(sum((2**g - 1) / math.log2(i + 2) for i, g in enumerate(grades[:k])))


def ndcg_at_k(ranked: Sequence[UUID], relevant: Mapping[UUID, int], k: int) -> float:
    actual = dcg_at_k([relevant.get(d, 0) for d in ranked], k)
    ideal = dcg_at_k(sorted(relevant.values(), reverse=True), k)
    return float(actual / ideal) if ideal > 0 else 0.0
