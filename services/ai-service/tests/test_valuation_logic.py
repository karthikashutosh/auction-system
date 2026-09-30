from uuid import UUID

from app.services.explain import allowed_numbers, numbers_are_grounded
from app.services.valuation import (
    Candidate,
    ValuationResult,
    classify,
    infer_category,
    trim_distance,
    trim_price_outliers,
)


def cand(i: int, price: float, dist: float, owner: int = 0, cat: str | None = "cameras") -> Candidate:
    return Candidate(UUID(int=i), f"t{i}", UUID(int=1000 + owner), cat, price, dist)


def test_trim_distance_drops_far_neighbours_but_keeps_min_five() -> None:
    near = [cand(i, 100, 0.10 + i * 0.005) for i in range(6)]
    far = [cand(10, 999, 0.55)]
    kept = trim_distance(near + far)
    assert len(kept) == 6 and all(c.price == 100 for c in kept)


def test_trim_distance_absolute_ceiling() -> None:
    assert trim_distance([cand(i, 1, 0.9) for i in range(6)]) == []


def test_price_outlier_removed_in_log_space() -> None:
    cs = [cand(i, p, 0.1, owner=i) for i, p in enumerate([9000, 10000, 11000, 10500, 9500, 250000])]
    assert 250000 not in [c.price for c in trim_price_outliers(cs)]


def test_classify_paths() -> None:
    assert classify([]) == "no_comparables"
    assert classify([cand(i, 1, 0.1, owner=i) for i in range(4)]) == "insufficient_data"
    assert classify([cand(i, 1, 0.1, owner=0) for i in range(6)]) == "single_seller"
    assert classify([cand(i, 1, 0.1, owner=i % 2) for i in range(6)]) == "ok"


def test_infer_category_abstains_on_split_vote() -> None:
    mixed = [cand(i, 1, 0.2, cat="a" if i % 2 else "b") for i in range(10)]
    assert infer_category(mixed) is None
    assert infer_category([cand(i, 1, 0.2, cat="a") for i in range(10)]) == "a"


def test_explanation_numbers_must_be_grounded() -> None:
    res = ValuationResult("ok", "cameras", [cand(i, 10000 + i * 100, 0.1, owner=i) for i in range(5)], 10100, 10200, 10300)
    allowed = allowed_numbers(res)
    assert numbers_are_grounded("Typically around ₹10,200, mostly ₹10,100 to ₹10,300 across 5 sales.", allowed)
    assert not numbers_are_grounded("Typically around ₹12,500.", allowed)
