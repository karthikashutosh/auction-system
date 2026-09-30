# AuctionFlow AI: how it works and why (interview guide)

Read this with the code open. Each section is: **what** → **why this way** → **what I rejected** →
**how I'd prove it** → **honest weaknesses**. If you can't explain a section without reading it,
that section is your homework. The "Try it yourself" boxes are the fastest way to own it.

---

## 0. The 60-second pitch

> AuctionFlow is a Node/Postgres auction app. I added an AI layer as a **separate Python service that is
> read-only against the database**. It does four things: hybrid semantic + keyword search, comparables-based
> price guidance, statistical fraud scoring, and an LLM agent that investigates flagged bids. Every AI
> result is **validated, measured against a labelled set, and degrades gracefully** when a model or the
> service is down. The LLM never computes a number; retrieval and SQL do.

The interviewer is checking three things: (1) do you know *why* each piece exists, (2) did you *measure* it,
(3) do you know where it breaks. The rest of this document is ammunition for those three.

---

## 1. The architecture and the one rule that shapes everything

```
Web ─► Node API ─► ai-service (Python, FastAPI) ─► Postgres (SELECT only)
          │              ▲
          ▼              │ POST /embed (pure compute)
       BullMQ ─► Node workers ─► Postgres (writes vectors, flags, verdicts)
```

**Rule: Python never writes to Postgres. Every write happens in Node, even when Python computed the value.**

- **Why:** blast radius. AI code is the least predictable code in the system (model output, prompt changes,
  new libraries). If it can't write, a bug or a prompt-injected agent can't corrupt auctions, bids or users.
- **Enforced by the database, not by convention:** migration `006` creates role `ai_service` with
  `GRANT SELECT` only (and *column-level* select on `users`, excluding email and password_hash). I proved it:
  `INSERT`/`UPDATE`/`DELETE` all return `permission denied`. "We just don't write" is a promise; a grant is a guarantee.
- **What it costs:** an extra hop. The worker calls Python to get a vector, then writes it itself. Verdicts from
  the agent are *returned* by `/investigate`, and Node persists them.
- **Rejected:** letting Python write to its own schema. Simpler, but then you have two writers and two sets of
  migrations, and you lose the guarantee above.
- **Interview line:** "Python computes, Node commits."

**Why a separate Python service at all (why not Node)?** The ML/agent ecosystem (LangGraph, evaluation tooling,
numerical code) is Python-first, and it lets me scale/deploy/fail the AI part independently. The cost is a network
boundary, which is why section 5 (resilience) exists. Be honest that for *only* calling an embeddings API, Node
would have been enough; the service earns its keep with the agent and evaluation code.

**Try it yourself:** connect as `ai_service` (`psql ... -U ai_service`, password in migration 006) and attempt an
`UPDATE auctions ...`. Watch it fail.

---

## 2. Embeddings and vector search (pgvector)

**What an embedding is:** a model turns text into a list of numbers (here 1536) so that *similar meaning ⇒ nearby
vectors*. Search = embed the query, find the nearest stored vectors.

**Distance metric: cosine** (`<=>`, index `vector_cosine_ops`). Why cosine: we care about direction (meaning), not
magnitude (text length). If vectors are unit-length, cosine ordering equals dot-product ordering.

**HNSW index (migration 005).** Exact nearest-neighbour is O(n) per query. HNSW is an *approximate* graph index:
faster, small recall loss. Trade-off knobs are `m`/`ef_construction` (build) and `ef_search` (query). At 490 rows an
index is irrelevant for speed; I built it because the design should hold at 100k+ and I wanted to show I know the
trade-off. Say that plainly.

**Why pgvector and not a vector DB (Pinecone/Qdrant):** the data already lives in Postgres. Vectors next to rows
means one transaction boundary, joins/filters in SQL (`status='ENDED'`, category), no sync pipeline, no second
system to run. A dedicated vector DB wins at very large scale or with heavy filtering needs; not here.

**Model versioning bug I designed against:** vectors from different models live in *different spaces*. Comparing
them is meaningless. So every row stores `embedding_provider` and `embedding_model`, and search filters
`WHERE embedding_model = <current>`. Switching provider therefore can't silently return garbage; the backfill
re-embeds any row whose model differs.

**Dimension mismatch:** the column is `vector(1536)`. Voyage/Ollama models have other native sizes, so their
adapters **zero-pad** to 1536. Why that's valid: padding with zeros doesn't change cosine distance. Gemini is asked
for 1536 directly (`outputDimensionality`) and re-normalised (truncated Matryoshka vectors aren't unit length).

**Embedding pipeline (Day 12):** on `createAuction`, Node enqueues a BullMQ job with a deterministic `jobId`
(`generate-embedding-<id>`). Why deterministic: enqueueing twice is a no-op (idempotent). The worker sends
`title\ndescription` to Python `/embed`, then *the worker* writes the vector. If Python is down the job throws and
BullMQ retries with exponential backoff (8 attempts), so **no job is lost**.

**Backfill:** batched, resumable, idempotent because it selects only rows where the embedding is missing or was
made by a different model. I killed Python mid-run (144/490 done); it retried and finished 490/490. That's the
proof, quote it.

**Weakness to volunteer:** embeddings are computed from title+description only; a listing's *condition* is barely
captured, which is why valuation is off (section 4).

---

## 3. Hybrid search: vector + keyword + RRF

**Why both?** Vector search understands meaning ("camera for film photography") but is sloppy on exact tokens
("Canon AE-1", model numbers). Keyword search (Postgres full-text: `tsvector` + GIN index + `ts_rank`) is exact but
has no notion of meaning. Hybrid tries to get both.

**Fusion: Reciprocal Rank Fusion**, `score(d) = Σ 1 / (k + rank_i(d))`, `k = 60`.
- **Why RRF and not "add the scores":** cosine distance and `ts_rank` are on incomparable scales. RRF only uses
  *ranks*, so it needs no normalisation and no tuning. `k=60` is the value from the original paper; it damps the
  advantage of rank 1 vs rank 2.
- `websearch_to_tsquery` (not `to_tsquery`) so user punctuation can't throw a syntax error. That's an edge-case
  decision: empty query, 5,000 chars, `'"; DROP TABLE`, emoji all return 200 (tested).

**The honest result you must not oversell:** on my 20-query golden set, hybrid (NDCG@10 0.836) **equals** vector-only
(0.836) with real Gemini embeddings; keyword-only is 0.542. I verified fusion is not broken (it reorders results),
it just adds nothing on this corpus: exact-term queries were already perfect under vector search, and the semantic
ones are already found. Saying "hybrid didn't help here, and here's why I believe that" is stronger than claiming a win.

**Try it yourself:** run the same query with `mode` = `vector`, `lexical`, `hybrid` against `POST /search` and look at
`vector_rank`/`lexical_rank` in the hits. Find a query where they disagree.

---

## 4. Evaluation: the part that separates you from "I called an API"

**Golden set:** 20 queries (7 exact, 8 semantic, 5 vague) with graded relevance (2 = ideal, 1 = acceptable).
**Labels come from listing metadata (brand/model/category/era/price), never from the retriever's output.** If you
label by looking at what search returns, you're grading the system with itself.

**Metrics (know these cold):**
- **Precision@K:** of the top K results, what fraction are relevant. Ignores order within K.
- **NDCG@10:** rewards putting the most relevant results *first*. DCG = Σ (2^rel − 1)/log2(i+1); NDCG = DCG / ideal DCG,
  so it's in [0, 1]. Be able to compute it by hand on 3 results; there's a unit test with the worked example.

**Results (real Gemini):** vector NDCG@10 0.836, P@5 0.88; exact 1.0, semantic 0.894, **vague 0.515** (the weak spot).

**Valuation backtest:** hold out each sold auction, predict its price from the others, and check whether the true
price falls in the predicted p25–p75 band. Result: **36 %** (a perfectly calibrated band would hit ~50 %),
median error 17 %.
- *Why it's below 50 %:* condition (Mint ×1.25 … For parts ×0.5) moves price a lot and the embedding doesn't
  capture it well. Next step: weight comparables by condition. Knowing your own model's failure cause is the point.

**Why fake/scripted providers existed at first and why we removed them:** they let me build and test the pipeline
without keys, but numbers from them mean nothing. Real numbers only come from real models on a labelled set.

---

## 5. Resilience: what happens when things fail (interviewers love this)

Everything crossing a network boundary has: **timeout → retry with backoff+jitter → circuit breaker**.

- **Retry:** exponential backoff with *jitter* (random fraction of the delay) so many clients don't retry in lockstep.
  Retry only *retryable* errors (429, 5xx, transport). Never retry a 400: it will fail identically.
- **Circuit breaker:** after N consecutive failures the breaker *opens* and calls fail instantly instead of waiting
  on a dead dependency; after a cool-down it goes *half-open* and lets one trial through. Demo I ran: with Python
  stopped, the first requests took ~0.05–0.18 s to fail, then ~0.0007 s (breaker open); after restart it recovered.
- **4xx must not trip the breaker** (it's the caller's bug, not an outage). There's a test for it.
- **Boot-time validation:** the service refuses to start if the chosen provider's key is missing (fail fast, clear
  message) rather than failing on the first user request.
- **Degrade, don't die:** valuation's LLM sentence is validated; if the provider errors or invents a number, we fall
  back to a template sentence built from the computed numbers. Node returns a clean `503 SEARCH_UNAVAILABLE`, never a hang.
- **Async, properly:** `async def` helps when *waiting on I/O* (HTTP to the model, DB). Blocking calls inside an async
  handler freeze the whole event loop for everyone, which is worse than plain sync. `health()` is sync on purpose.
  (See `ASYNC_NOTES.md`.)

**Try it yourself:** `docker stop auction-ai-service`, hit `/api/auctions/search`, watch the latency drop once the
breaker opens, then start it again.

---

## 6. Valuation: "the LLM never computes the number"

Pipeline: embed the new listing → nearest *sold, ended* auctions (SQL, filtered by category, excluding itself) →
trim → percentiles in SQL (`percentile_cont`) → **one** LLM call that only *phrases* the result.

- **Why the LLM doesn't compute:** LLMs are unreliable at arithmetic and can't be audited. Retrieval + SQL is
  deterministic and testable. The model gets `{comparables, median, range}` and must restate them.
- **Guardrail:** the returned sentence is parsed (Pydantic) and every number in it must match an input number
  (`numbers_are_grounded`), otherwise we use the template. That's *output validation*, and you should call it that.
- **Retrieval tuning (the "where the time goes" part):** distance ceiling, a window relative to the best match,
  and **outlier removal in log-price space** with Tukey fences (prices are multiplicative, so a 10× item is an
  outlier even if the absolute gap looks small). Trimming never pushes you below the minimum sample size.
- **Explicit failure states:** `no_comparables`, `insufficient_data` (<5), `single_seller` (all comparables from one
  seller means it's one person's pricing, not a market). Each returns *no range* rather than a range computed from n=1.
- **Why p25–p75 not mean±sd:** prices are skewed; percentiles are robust.

---

## 7. Fraud detection: statistics before AI

**Features per bid** (all derivable from the existing schema): velocity (bids by that account in the previous 60 s),
account age at bid, share of the account's bids on this seller (needs ≥8 prior bids), seconds before close.

**Scoring: robust z-score = (x − median) / (1.4826 · MAD)**, clipped, weighted, summed, squashed to 0–1.
- **Why median/MAD instead of mean/std:** a bot inflates the mean and std of the very population it's judged
  against ("masking"), hiding itself. Median/MAD barely move. There's a test that trains on 10 % bots and still flags a bot.
- **Why not IQR fences:** they give in/out, but I wanted a continuous score that can be added across features and
  explained per feature (`contributions` is stored with every flag).
- **Scale floors:** MAD can be ~0 (almost every bid has velocity 1), which would turn ordinary variation into huge
  z-scores. Floors prevent that.
- **Plain pure functions:** `score_features(features, baseline) → score`. No framework, easy to unit test.
- **Baseline caching:** the full-table feature scan cost ~200 ms; the trace showed the first request after every TTL was
  ~30× slower. Fix: warm at startup + stale-while-revalidate. *This is your "one problem tracing revealed" story.*

**Results (seeded data with 5 planted patterns):** 5/5 patterns caught, 74.8 % of planted bids flagged, 0.19 % false
positives. **Tune-by-diagnosis story:** false positives were 4 % at first; I broke down *which feature* drove them,
found account-age scale too tight, raised the floor, and (separately) discovered the remainder were my own hand-made
test bids in the DB, which legitimately look suspicious.

**Honest limits (say this unprompted):** no IP/device/payment data, so no collusion-ring or shared-device detection;
it scores single bids against a population, so slow patient manipulation is invisible; the baseline is fit on data
that may contain undetected fraud; on a tiny messy dev DB (163 hand-made bids) it did **not** flag a 6-bid burst
because the baseline itself was garbage. A detector is only as good as its reference population.

**Non-blocking by design:** the bid API enqueues scoring after commit and never awaits it (fire-and-forget with
errors logged). A slow or broken detector must never fail a bid.

---

## 8. The agent (LangGraph): loop, tools, guardrails

**What an agent is, precisely:** a loop. The model sees state, either asks for a tool call or gives a final answer;
the code runs the tool and feeds the result back; repeat. LangGraph gives you that as a **graph**: nodes
(`model`, `tools`, `verify`, `partial`), a typed state, and conditional edges. I built a toy two-tool agent first
to learn state/nodes/edges before doing the real one.

**Tools** (`getAccountMetadata`, `getBidderHistory`, `getSellerAuctions`, `getBidTimeline`):
- Read-only, Pydantic-typed inputs, and they **return structured errors instead of raising** (`ToolError{code, message, retryable}`),
  so the model can read the failure and adapt. Tool *descriptions* are prompts: the model chooses tools from them,
  so they say when to use the tool and when *not* to.
- Real bug found by evaluation: the metadata tool only reported *current* account age, so a 30-day-old account that
  bid 2 hours after signup looked established. I added `age_hours_at_first_bid`. Lesson: **tool design determines
  what the agent can conclude.**

**Guardrails (each has a test):**
- Hard max turns → stop with a *partial* result.
- Cumulative cost ceiling → stop with a partial result (cost computed from token usage × price table).
- Stuck-loop detection: same tool + same args twice → abort. (Cheaper and more reliable than hoping the model notices.)
- Invalid model output never surfaces as a 500: it becomes `inconclusive`, low confidence, and is counted as a validation failure.

**Structured verdict + self-verification:** the model must return `{verdict, confidence, evidence[], reasoning}` validated
by Pydantic. Then a second pass asks whether the evidence actually supports the conclusion and *downgrades confidence*
if not. Also a programmatic rule: a definite verdict with no evidence is capped at 0.3.

**Honest agent result (27 real Gemini runs):** the agent got **21/27** right vs **23/27** for the detector alone.
It cleared all 4 detector false positives (its real value: precision), but missed two whole fraud families
(new-account whale 0/3, seller loyalist 0/3). Reading the trajectories showed *why*: not a missing tool, the model
**saw** "first bid 2 hours after signup" and "100% of 24 bids on one seller" and **explained them away** ("common
for niche collectors"). The same-model self-check accepted it: *self-verification shares the generator's blind
spots.* Tightening the prompt moved 19 → 21/27 (and fixed sniping), but not those two.
When did the loop earn its keep vs one call? On **false-positive clearing**, not on catching fraud.

**Trajectory-eval lesson (great story):** my first trajectory checks (redundant calls, turn count, no lookups,
low evidence) reported **zero failures on all 27 runs, including the 6 wrong ones**. A process metric can be green
while the answer is wrong. I added `benign_despite_strong_signal` (verdict benign while its own tool results contain
a red flag); scored offline it flags exactly the 6 bad cases and 0 of 12 good ones.

**Trajectory evaluation:** score the *sequence* (redundant calls, too many turns, concluding on turn 1 with no lookups,
low evidence, ignoring a tool error), not just the final answer. A correct answer reached by a bad path is a latent bug.

**Prompt-injection note:** the agent's tool outputs contain user-authored text (titles, names). Because the agent has
only read-only tools and Python can't write, the worst outcome is a wrong verdict, not data damage. That's the
boundary from section 1 paying off.

---

## 9. Observability and cost

- **Instrumentation wrapper:** every model call records provider, model, operation, latency, tokens, estimated cost,
  validation outcome, and a `feature` tag, as one structured JSON log line. `/metrics` aggregates p95 latency, cost per
  1k requests and validation-failure rate per feature/provider.
- **OpenTelemetry spans** across request → retrieval → each LLM call → each tool call (`OTEL_ENABLED=true`, optional
  Jaeger/Langfuse via OTLP). Why: an agent's latency is a *tree*, not a number; you find the slow step by looking at spans.
- Measured (real Gemini): search p95 ≈ 0.7 s (almost all of it the embedding API call), agent turn p95 ≈ 2.6 s.
- Cost numbers use *estimated* prices; Gemini doesn't report embedding tokens, so those are ~4 chars/token estimates.
  Say "estimated" every time.

---

## 10. Bugs found along the way (great behavioural-interview stories)

1. **Timezone drift:** `auctions.*_time` were `timestamp` (no zone) in one DB while the migration said `timestamptz`.
   node-pg wrote IST wall-clock; Python read it as UTC, off by 5.5 h; my "sniper" bids showed as 5.5 h before close.
   Found because the *agent evaluation contradicted my seed data*. Fixed with migration 009. Lesson: cross-service
   time bugs hide until two runtimes disagree.
2. **Winners never notified:** the expiry worker read `is_reserve_met`, a column its query never selected (silently
   `undefined`). Now computed explicitly.
3. **`SELECT *` would leak embeddings** to API clients: explicit column list.
4. **Provider drift:** `gemini-2.5-flash` closed to new keys; Gemini 3 requires echoing `thoughtSignature` on tool
   calls, otherwise every agent call fails with 400. Fixed with an opaque `provider_meta` field.
5. **Stale container:** the Docker image predated the Gemini code, so the service silently stayed on the old provider.
   `/health` exposing the active provider made it obvious.

---

## 11. Questions to rehearse (and where the answer lives)

| Question | Answer lives in |
|---|---|
| Why can't the AI service write to the DB? How do you know? | §1, migration 006 |
| Cosine vs dot vs L2? Why HNSW, what's the trade-off? | §2 |
| What if you change embedding model? | §2 (model column + filter + backfill) |
| Why RRF rather than weighted score sum? | §3 |
| Hybrid didn't beat vector. Why, and would you ship it anyway? | §3 (say: keep it for exact-ID queries and robustness; the data doesn't prove a gain) |
| How did you evaluate search? What's NDCG? | §4 |
| Why is your valuation hit rate only 36 %? | §4/§6 (condition not modelled) |
| What happens when the AI service / provider is down? | §5 |
| Why doesn't the LLM compute the price? | §6 |
| Why median/MAD? What's masking? | §7 |
| What can your fraud detector *not* catch? | §7 limits |
| How do you stop an agent looping or overspending? | §8 guardrails |
| Your agent got a case wrong. Why? | §8 |
| How would this scale to 1M listings? | HNSW tuning/partitioning, async embedding queue already, cache `/search` by normalised query, batch embeddings, per-feature rate limits, move baseline to a scheduled job |
| What would you do differently? | Model condition in valuation; longer evaluation set; larger labelled fraud set from real reports; retrieval reranking; agent evaluation across several models |

## 12. How to actually own this (do these, don't just read)

1. **Rebuild `rrf_fuse` and `ndcg_at_k` from a blank file** without looking, then diff against the repo.
2. **Break it on purpose:** set `WEIGHT`/`SCALE_FLOOR` in `fraud.py` to extremes and watch `eval_fraud.py` change; drop
   the distance ceiling in valuation and read the backtest; set `AGENT_MAX_COST_USD=0.0005` and watch the partial result.
3. **Trace one request end to end:** create an auction in the UI → follow the BullMQ job → the worker → `/embed` → the
   `UPDATE` (read the logs at each hop).
4. **Explain the tests:** for each file in `tests/`, say which failure it prevents. If you can't, that's a gap.
5. **Answer out loud, timed:** the 60-second pitch, then "what would you change?" (2 minutes).

**Be honest about AI assistance.** If asked, say you used AI to accelerate implementation and that the value you added
was the architecture decisions, the evaluation, and the debugging above. That is credible *only* if you can defend
every section here, so make sure you can.
