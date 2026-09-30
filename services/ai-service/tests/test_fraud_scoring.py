import random

from app.services.fraud import Baseline, fit_baseline, make_features, score_features


def normal_population(n: int = 3000, seed: int = 1) -> list[dict[str, float]]:
    rnd = random.Random(seed)
    rows = []
    for _ in range(n):
        rows.append(
            make_features(
                bids_last_60s=1,
                account_age_hours=rnd.uniform(24 * 30, 24 * 600),
                same_seller_bids=round(rnd.uniform(1, 6)),
                total_bids=rnd.randint(20, 60),
                secs_to_close=rnd.uniform(60, 5 * 86400),
            )
        )
    return rows


BASE: Baseline = fit_baseline(normal_population())


def score(**kw: float):  # type: ignore[no-untyped-def]
    defaults = dict(bids_last_60s=1, account_age_hours=24 * 200, same_seller_bids=2, total_bids=30, secs_to_close=86400)
    return score_features(make_features(**{**defaults, **kw}), BASE)


def test_normal_bids_are_not_flagged() -> None:
    flagged = sum(score_features(f, BASE).flagged for f in normal_population(2000, seed=2))
    assert flagged / 2000 < 0.01


def test_rapid_bot_flagged() -> None:
    r = score(bids_last_60s=15, same_seller_bids=25, total_bids=30)
    assert r.flagged and r.contributions["velocity"] > 0


def test_brand_new_account_flagged() -> None:
    assert score(account_age_hours=2, bids_last_60s=3).flagged


def test_seller_loyalist_flagged() -> None:
    assert score(same_seller_bids=24, total_bids=24).flagged


def test_sniper_flagged() -> None:
    assert score(secs_to_close=4, bids_last_60s=5).flagged


def test_single_mild_signal_is_not_flagged() -> None:
    assert not score(secs_to_close=20).flagged


def test_concentration_needs_history() -> None:
    # 3 of 3 bids on one seller is meaningless for a brand-new bidder history.
    assert make_features(bids_last_60s=1, account_age_hours=500, same_seller_bids=3, total_bids=3, secs_to_close=5000)["concentration"] == 0.0


def test_scorer_is_robust_to_contamination() -> None:
    """Masking check: 10% bots in the training data must not blind a median/MAD baseline."""
    rows = normal_population(2700) + [
        make_features(bids_last_60s=12, account_age_hours=3, same_seller_bids=20, total_bids=20, secs_to_close=6)
        for _ in range(300)
    ]
    contaminated = fit_baseline(rows)
    bot = make_features(bids_last_60s=12, account_age_hours=3, same_seller_bids=20, total_bids=20, secs_to_close=6)
    assert score_features(bot, contaminated).flagged
