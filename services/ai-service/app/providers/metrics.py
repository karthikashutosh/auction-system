import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class CallRecord:
    provider: str
    model: str
    operation: str
    feature: str
    latency_ms: float
    tokens: int
    cost_usd: float
    validation: str  # "ok" | "failed"
    error: str | None = None
    ts: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


class MetricsStore:
    """In-memory. Python is read-only against Postgres, so nothing is persisted here."""

    def __init__(self) -> None:
        self.records: list[CallRecord] = []

    def add(self, record: CallRecord) -> None:
        self.records.append(record)

    def reset(self) -> None:
        self.records.clear()

    def summary(self) -> dict[str, dict[str, float]]:
        by_feature: dict[str, list[CallRecord]] = defaultdict(list)
        for r in self.records:
            by_feature[r.feature].append(r)
        out: dict[str, dict[str, float]] = {}
        for feature, all_rs in by_feature.items():
            # "chat_validation" rows are failure markers, not calls.
            rs = [r for r in all_rs if r.operation != "chat_validation"]
            if not rs:
                continue
            lat = sorted(r.latency_ms for r in rs)
            p95 = lat[max(0, math.ceil(0.95 * len(lat)) - 1)]
            cost = sum(r.cost_usd for r in rs)
            failed = sum(1 for r in all_rs if r.validation == "failed" or r.error)
            out[feature] = {
                "calls": float(len(rs)),
                "p95_latency_ms": p95,
                "cost_usd": cost,
                "cost_per_1k_requests_usd": cost / len(rs) * 1000,
                "validation_failure_rate": failed / len(rs),
            }
        return out

    def validation_failure_by_provider(self) -> dict[str, float]:
        totals: dict[str, list[int]] = defaultdict(lambda: [0, 0])
        for r in self.records:
            if r.operation != "chat_validation":
                totals[r.provider][0] += 1
            if r.validation == "failed" or r.error:
                totals[r.provider][1] += 1
        return {p: f / n for p, (n, f) in totals.items()}


metrics_store = MetricsStore()
