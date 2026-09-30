"""OpenTelemetry: spans across request -> retrieval -> LLM calls -> tool invocations.

Disabled (no-op tracer, ~zero cost) unless OTEL_ENABLED=true. When enabled, spans go to an
in-process buffer (GET /debug/spans summarises it) and, if OTEL_EXPORTER_OTLP_ENDPOINT is set,
to any OTLP collector (Jaeger, Langfuse, Tempo...).
"""
import os
from collections import defaultdict
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import ReadableSpan, TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SimpleSpanProcessor, SpanExporter, SpanExportResult

from app.core.config import settings


class BufferExporter(SpanExporter):
    def __init__(self, cap: int = 20_000) -> None:
        self.spans: list[ReadableSpan] = []
        self.cap = cap

    def export(self, spans: Any) -> SpanExportResult:
        self.spans.extend(spans)
        del self.spans[: max(0, len(self.spans) - self.cap)]
        return SpanExportResult.SUCCESS

    def shutdown(self) -> None:
        return None

    def clear(self) -> None:
        self.spans.clear()


buffer = BufferExporter()
_enabled = False


def setup_tracing() -> None:
    global _enabled
    if not settings.otel_enabled or _enabled:
        return
    provider = TracerProvider(resource=Resource.create({"service.name": settings.app_name}))
    provider.add_span_processor(SimpleSpanProcessor(buffer))
    if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    _enabled = True


def _tracer() -> trace.Tracer:
    return trace.get_tracer("ai-service")


@contextmanager
def span(name: str, **attrs: Any) -> Iterator[trace.Span]:
    with _tracer().start_as_current_span(name) as s:
        for k, v in attrs.items():
            if v is not None:
                s.set_attribute(k, v)
        yield s


def summarize_spans() -> dict[str, dict[str, float]]:
    by_name: dict[str, list[float]] = defaultdict(list)
    for s in buffer.spans:
        if s.end_time and s.start_time:
            by_name[s.name].append((s.end_time - s.start_time) / 1e6)
    out: dict[str, dict[str, float]] = {}
    for name, ds in by_name.items():
        ds.sort()
        out[name] = {
            "count": float(len(ds)),
            "total_ms": round(sum(ds), 2),
            "mean_ms": round(sum(ds) / len(ds), 2),
            "p95_ms": round(ds[max(0, int(0.95 * len(ds) + 0.999999) - 1)], 2),
        }
    return out
