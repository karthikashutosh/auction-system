# RESULTS

> **Read this first.** The offline `fake` embedding and `scripted` chat providers and the seeded
> demo data (454 auctions, 96 users, 4,343 bids) were **removed** after these measurements were
> taken. Sections marked *(historical)* below were measured on that data and cannot be reproduced
> without re-running `npm run seed:auctions` (deterministic) and rebuilding `data/golden.json` with
> `scripts/build_golden.py`. The "Real provider run: Gemini" section used the same seeded corpus.

## Corpus and backfill (Days 8-9, 13-14)

| Item | Value |
|---|---|
| Seeded closed auctions | 454 (8 categories × 8 models × 7 + 6 planted-seller listings) |
| Seeded users / bids | 96 / 4,343 |
| Pre-existing dev rows in the DB | 36 auctions, 163 bids (kept; included in embeddings) |
| Auctions embedded | 490 / 490, one dimension (1536) |
| Backfill wall-clock | 1.6 s (fake provider) |
| Tokens embedded | 19,895 |
| Cost | $0 (fake). At `text-embedding-3-small` list price ($0.02/1M) this corpus is ≈ $0.0004 |
| Idempotence | second run: 0 rows touched |
| Outage drill | killed ai-service at 144/490, restarted; backfill retried and finished 490/490 |

Price distribution per category (median / p10 / p90, ₹): see `services/ai-service/data/seed-manifest.json`.
Planted suspicious patterns (IDs in the same file): `rapid_bot`, `new_account_whale`,
`seller_loyalist`, `sniper_burst`, `combo_new_account_single_seller`.

## Read-only boundary (Days 10, 12.5)

`ai_service` role, connected over the real DB:

```
select count(*) from auctions      -> 36 (at the time)   OK
insert into bids ...               -> ERROR: permission denied for table bids
update auctions set embedding=null -> ERROR: permission denied for table auctions
select email from users            -> ERROR: permission denied for table users   (column-level grant)
delete from bids                   -> ERROR: permission denied for table bids
```

## Search evaluation (Days 22-25) — 20 queries (7 exact, 8 semantic, 5 vague)

`PYTHONPATH=. uv run python -m app.eval.run_eval` (labels come from listing metadata via
`scripts/build_golden.py`, never from the retriever's output).

| Mode | P@5 | P@10 | NDCG@10 |
|---|---|---|---|
| lexical only | 0.550 | 0.425 | 0.542 |
| vector only (baseline) | 0.880 | 0.760 | 0.788 |
| hybrid + RRF (k=60) | 0.880 | 0.760 | **0.790** |

**Honest reading:** hybrid ≈ vector here (+0.002 NDCG). That is expected, not a win: the fake
embedder is itself a hashed bag-of-words, so the vector list already contains what the lexical
list would add. **The headline resume delta must come from a real embedding model** (⏳ rerun with
`EMBEDDING_PROVIDER=openai`). Exact-match queries: P@5 = 1.0 in every mode. Vague queries are the
weak spot for every mode (P@5 0.52 vector/hybrid, 0.0 lexical).

Provider swap (Day 26): ⏳ Voyage adapter is implemented (1024-d zero-padded to the 1536 column,
cosine unchanged) and unit-tested against mocked HTTP; search filters on `embedding_model`, so
switching providers never mixes vector spaces, and `backfill:embeddings` re-embeds rows whose model
differs. No numbers, since there was no key.

## Valuation backtest (Days 29-35)

All 388 sold auctions held out one at a time (itself excluded from its own comparables), category
inferred, `scripts/backtest_valuation.py 400`.

| Metric | Value |
|---|---|
| Actual price inside suggested p25-p75 range | **34.9 %** (387 of 388 got a range) |
| Median absolute % error of the median | 18.6 % |

The range is a p25-p75 band so a perfectly calibrated one would hit ~50 %. The shortfall is mostly
condition (Mint ×1.25 … For parts ×0.5 in the seed) not being modelled; weighting comparables by
condition is the obvious next step. Failure paths implemented and unit-tested: no comparables,
< 5 comparables, all from one seller → no range is shown, only an explanatory state.

## Fraud detector (Days 36-42)

`scripts/eval_fraud.py`, robust z-scores (median/MAD) over 4 features.

| Metric | Value |
|---|---|
| Planted patterns caught (≥1 flagged bid) | **5 / 5** |
| Planted-bid recall | 74.8 % (bot 85 %, whale 67 %, loyalist 71 %, sniper 63 %, combo 83 %) |
| False-positive rate on normal seeded bids | 0.19 % (8 of 4,300) |
| Daily flag rate (normal only) | 0.067 / day over the 120-day seed window (drift baseline) |

Note: the hand-made dev bids in the same DB (rapid, single seller, new accounts) are flagged 140
times: they *are* suspicious-looking; they are excluded from the rates above.

**What the detector cannot see (honest limits, Day 42).** The schema has no IP address, device
fingerprint, payment instrument or session data, so it cannot detect collusion rings, shared-device
sockpuppets, or shill accounts that avoid a single seller and act at human speed. It scores single
bids against the population, so slow, patient manipulation (one bid per week from many aged
accounts) is invisible. The baseline is fit on all data including undetected fraud (median/MAD is
robust to ~10 % contamination — tested — but not to a majority). Concentration needs ≥ 8 prior bids,
so a fresh account can only be caught through age/velocity/proximity.

## Agent (Days 43-54) — scripted provider, 27 investigations

`scripts/eval_agent.py` (15 planted-pattern bids, 4 detector false positives, 8 controls).

| Metric | Value |
|---|---|
| Mean turns / tool calls per investigation | 4.33 / 3.33 |
| Mean cost | $0 (scripted). For a real model see `/metrics` `agent_turn` |
| Detector alone correct | 23 / 27 (misses: the 4 false positives) |
| Agent correct (definite verdict, matches truth) | 24 / 27; 3 inconclusive (whale ×3) |
| Trajectory failures found | none (redundant calls, over-long, no-lookup, low-evidence: all 0) |

**When did the loop earn its keep?** On the 4 detector false positives: 4/4 were cleared as benign
with cited evidence. A single call to the detector flags them. For real fraud the loop only added
an explanation. **Where it lost:** the new-account whale — the detector caught 100 % of the bids
but the agent's single-signal rule left it inconclusive. **Caveat:** this is the scripted policy, so
it measures the loop/guardrails/harness, not model judgement. ⏳ Re-run with `CHAT_PROVIDER=anthropic`.

Bugs the evaluation itself surfaced (both fixed): (1) `getAccountMetadata` reported only *current*
account age, so a 30-day-old account that bid 2 hours after signing up looked established — added
`age_hours_at_first_bid`; (2) a "benign" verdict with no evidence was self-downgraded to confidence
0.3 — benign calls now cite what was checked.

Guardrails verified by tests: max-turn limit, cost ceiling → clean partial result, identical
(tool,args) twice → `stuck_loop`, malformed model output → inconclusive (never a 500), tool failure
→ investigation still completes.

## Agent on real Gemini (`gemini-3.1-flash-lite`), 27 investigations

`scripts/eval_agent.py`: 15 planted-pattern bids, 4 detector false positives, 8 normal controls.

| | Detector alone (1 call) | Agent, first prompt | Agent, tightened prompt |
|---|---|---|---|
| Correct | 23 / 27 | 19 / 27 | **21 / 27** |
| Mean turns / tool calls | n/a | 2.0 / 3.0 | 2.33 / 3.19 |
| Mean cost / investigation | ~$0 | $0.00087 | $0.00115 |
| Detector false positives cleared | 0 / 4 | 4 / 4 | 4 / 4 |
| Normal controls judged benign | n/a | 8 / 8 | 8 / 8 |

Per pattern with the tightened prompt: rapid bot 3/3, sniper 3/3 (was 1/3), combo 3/3,
**new-account whale 0/3, seller loyalist 0/3** (verdict "benign", confidence 0.4-0.9).

**Reading it honestly:** the agent is *worse* than the detector at catching fraud (it misses two whole
pattern families) and *better* at clearing the detector's false positives. So a loop that only *reviews*
detector flags earns its keep on precision, not recall.

**Why it fails (from the saved trajectories):** it is not a missing tool or a prompt gap. The model saw the
signals and explained them away: "account age at first bid was 2 hours" then "does not show signs of
malicious activity"; "top seller share is 1.0" then "common for niche collectors". That is a reasoning
failure of a small model, and the self-verification pass (same model) accepted it.

**Trajectory-eval gap found and closed:** the original checks (redundant calls, turn count, no lookups,
low evidence, ignored tool error) reported **zero** failures on all 27 runs, including the 6 wrong ones.
Added `benign_despite_strong_signal` (a benign verdict while the agent's own tool results contain a
red flag). Scored offline on the saved trajectories it flags exactly those 6 cases and 0 of the 12 benign
ones. Files: `data/eval_agent.json` (after), `data/eval_agent_before_prompt.json`, `data/trajectories.jsonl`.

Caveats: one small model, 27 cases (3 near-identical bids per pattern, so effectively 5 patterns), one run
each; results at temperature 0.2 vary between runs (the first run had sniper 1/3, the second 3/3 with a
different prompt, so part of that gain may be noise). A stronger model, or a rule that forces a
"suspicious/inconclusive" verdict when hard thresholds are crossed, are the obvious next experiments.

## Latency, cost, validation (Day 54) — `scripts/load_probe.py`, local, fake/scripted providers

| Feature | mean ms | p95 ms | cost / 1k req |
|---|---|---|---|
| `POST /search` (hybrid) | 3.8 | 4.7 | $0 (fake); ≈ $0.0001-0.0004 with OpenAI (1 short query) |
| `POST /valuation` | 4.1 | 5.2 | $0 (fake) + one chat call |
| `POST /fraud/score` | 1.8 | 2.6 | $0 |
| `POST /investigate` | 13.1 | 19.3 | $0 scripted |

Validation failure rate per provider: fake 0 %, scripted 0 % (Anthropic/OpenAI/Voyage: ⏳).

**One problem the traces revealed:** the first `/fraud/score` after every 10-minute TTL paid for a
full-table feature scan (~200 ms vs ~2 ms): it showed up as mean 9.4 ms vs p95 2.9 ms on the span
summary. Fixed with startup warm-up plus stale-while-revalidate; first call after boot is now 37 ms.
Also: in `/search` the vector leg (2.1 ms) costs ~5× the lexical leg (0.4 ms).

## Real provider run: Gemini (one key) — 2026-09-30

`AI_PROVIDER=gemini`: embeddings `gemini-embedding-001` (1536-d), chat `gemini-3.1-flash-lite`.

| Item | Value |
|---|---|
| Backfill (490 auctions) | 293.6 s wall-clock (free-tier 429s + retries + 1.2 s throttle), 32,403 est. tokens (API reports none for embeddings), ≈ $0.005 at the assumed $0.15/1M |
| Search NDCG@10 vector / hybrid / lexical | **0.836** / 0.836 / 0.542 (fake embedder: 0.788 / 0.790 / 0.542) |
| Search P@5 / P@10 (vector = hybrid) | 0.88 / 0.785 |
| Semantic queries NDCG@10 | 0.894 (fake: 0.831); vague queries 0.515 (fake: 0.422) |
| Valuation backtest (100 held out) | 31 % inside p25-p75, median error 19.4 % (distance threshold not retuned for Gemini) |
| Agent, 2 spot checks | rapid bot → suspicious 0.90 (4 turns, $0.0016); seller-loyalist → **benign 0.90 (wrong)** (2 turns, $0.0009) |

Reading: real embeddings beat the fake one by ~0.05 NDCG, mostly on semantic and vague queries, but
**hybrid still equals vector-only** on this corpus (the lexical list adds nothing the vector list
misses, and exact-term queries are already perfect), so the "hybrid beats vector" claim is *not*
supported by this data. Report it that way. The agent miss is a genuine failure mode: the model
called three tools in parallel, never asked for the seller breakdown, and concluded "benign" with
0.9 confidence; the self-verification pass accepted it. The full 27-case agent eval is in the next section.

Integration issues found and fixed on the way: Gemini 3 requires echoing `thoughtSignature` on
function calls (added `ToolCall.provider_meta`); `gemini-2.5-flash` is closed to new keys;
pydantic JSON-schema keys (`title`, `format`, `$defs`) are stripped for Gemini tool declarations.

## Verification pass (2026-09-30) — bugs found by testing the finished system

Layers checked: Python (69 tests, mypy strict), Node (42 API + 5 client tests, tsc on 8 workspaces),
production web build, production Docker images for api/worker (built and imported the new package inside
them), live end-to-end calls against real Gemini, and the UI in a real browser (search, price guidance,
similar listings). Injected-bug ("mutation") check: 9 deliberate bugs, 7 caught by existing tests; the 2
survivors exposed missing tests, now added and re-verified as caught.

Bugs found and fixed:

| Bug | How it was found | Fix |
|---|---|---|
| `AI_PROVIDER=openai/voyage/anthropic` (documented values) failed to boot | trying each documented value | embedding-only vendors boot with chat marked unavailable; Anthropic gives a clear "no embeddings" error |
| Valuation returned a confident range for nonsense ("Quantum flux capacitor") | live call with real Gemini | cosine-distance ceiling was tuned for the removed fake embedder (0.6); measured real distances (relevant ≤ 0.30, unrelated ≥ 0.41) → 0.35; backtest unchanged (36.1 %) |
| Search with a NUL character returned 503 | edge-case sweep | control characters stripped in Node and Python |
| 10 rapid bids triggered up to 7 paid LLM investigations | live bid burst | one investigation per (bidder, auction) via deterministic BullMQ jobId; verified 7 flags → 1 investigation |
| One shared circuit breaker: a valuation-LLM outage would also cut off search | code review | breaker per endpoint group + test |
| Production would break on deploy: prod Postgres had no pgvector, AI service not built/deployed, CI ignored Python and the new client tests | reading `docker-compose.prod.yml` and `ci-cd.yml` | pgvector image, `ai-service` added (not published), CI runs mypy+pytest and builds/pushes the image |
| `@repo/ai-client` tests failed in CI (compiled test copy in `dist/`) | running the CI command locally | tests excluded from the build |
| Concurrent first requests could each create a DB pool; background baseline refresh could leave an unhandled task error; configured provider timeout was never applied | code review | lock, logged fallback to the stale baseline, setting now used |

Not from my code: the login page and auth-bootstrap screen log a React hydration warning (emotion style tag
mismatch); `apps/web` has an empty ESLint config, so lint is not a usable signal there.

Deployment note: `docker-compose.prod.yml` expects `services/ai-service/.env.production` and a rotated
`ai_service` DB password (migration 006 ships a dev password). The AI service has no authentication of its
own; it must stay on the private network (no published port in prod).

## Bugs found and fixed along the way

- `auctions.start_time/end_time/created_at/updated_at` were `timestamp without time zone` in the
  Docker DB (an old dump) while migration 002 says `timestamptz`. node-pg wrote IST wall-clock,
  so anything that reads with UTC semantics (the Python service) was off by 5.5 h. Migration
  `009` converts them (no-op where already `timestamptz`).
- Auction-expiry worker never notified winners: it read `is_reserve_met`, a column that
  `getValidAuctionById` doesn't select. Now computed from `current_price >= reserve_price`.
- `SELECT *` on auctions would have leaked embedding vectors: explicit column list (`AUCTION_COLUMNS`).
- Zod validation errors returned 500; now 400 with issues.
- Noticed, not changed: worker compares `new Date() < validAuction.endTime` (undefined; the column
  is `end_time`), so the "expired too early" guard never triggers.

## Not done (needs you)

Live deploy + README diagram with real numbers (Day 27), resume and applications (Days 28, 54),
real-provider numbers (⏳ above), Milestone 3 (document extraction, k6 load test, write-up).
