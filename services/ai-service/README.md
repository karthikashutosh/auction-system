# ai-service

FastAPI service for embeddings, hybrid search, comparables valuation, fraud scoring and the
investigation agent. **Read-only against Postgres** (role `ai_service`, no INSERT/UPDATE/DELETE
granted); every write happens in Node.

```
 Web ──► Node API ──► ai-service ──► Postgres (SELECT only, pgvector + tsvector)
            │             ▲                ▲
            ▼             │ /embed         │ writes vectors, flags, verdicts
         BullMQ ──► Node workers ───────────┘
      (embedding, fraud)
```

| Endpoint | Purpose |
|---|---|
| `GET /health`, `/ready`, `/metrics`, `/debug/spans` (OTEL on) | ops |
| `POST /embed`, `/embed/batch` | text → vector (no DB) |
| `POST /search` | `mode=vector|lexical|hybrid` → ranked IDs + scores (RRF k=60) |
| `POST /similar/{id}` | nearest listings by stored vector |
| `POST /valuation` | comparables → p25/median/p75 (SQL `percentile_cont`) + one validated sentence |
| `POST /fraud/score` | robust-z bid score, per-feature contributions |
| `POST /investigate` | LangGraph agent → validated verdict (returned, not persisted) |

## Run

```bash
uv sync
cp .env.example .env            # then set AI_PROVIDER and AI_API_KEY
uv run uvicorn app.main:app --port 8001
uv run pytest && uv run mypy app
```

Providers: **one provider, one key** — set `AI_PROVIDER=gemini` and `AI_API_KEY=...` in `.env` and
embeddings, the valuation sentence and the fraud agent all use it. A provider is required: the
service refuses to boot without one (`ollama` is free/local and needs no key).
Check it with `PYTHONPATH=. uv run python scripts/smoke_provider.py`. Advanced per-feature
overrides: `EMBEDDING_PROVIDER=openai|voyage|gemini|ollama`, `CHAT_PROVIDER=anthropic|gemini|ollama`
(the service refuses to boot if the chosen provider's key is missing). Tracing: `OTEL_ENABLED=true`
(+ `OTEL_EXPORTER_OTLP_ENDPOINT` for Jaeger/Langfuse; `docker compose --profile tracing up jaeger`).

Scripts (`PYTHONPATH=. uv run python …`): `scripts/build_golden.py`, `-m app.eval.run_eval`,
`scripts/backtest_valuation.py`, `scripts/eval_fraud.py`, `scripts/eval_agent.py`,
`scripts/load_probe.py`. Node side: `npm run seed:auctions -w @auction/api` and
`npm run backfill:embeddings -w @auction/worker`. Results: `/RESULTS.md`.
