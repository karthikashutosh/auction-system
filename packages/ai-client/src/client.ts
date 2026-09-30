import { CircuitBreaker, CircuitOpenError, withRetry } from "./resilience";

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly unavailable = false
  ) {
    super(message);
  }
}

export interface SearchHit {
  id: string;
  score: number;
  distance: number | null;
  vector_rank: number | null;
  lexical_rank: number | null;
}

export interface SearchResult {
  hits: SearchHit[];
  mode: string;
  query: string;
  total_candidates: number;
}

export interface EmbedResult {
  embedding: number[];
  provider: string;
  model: string;
  dimensions: number;
  tokens: number;
}

export type SearchMode = "vector" | "lexical" | "hybrid";

interface Options {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  breaker?: CircuitBreaker;
  sleepFn?: (ms: number) => Promise<void>;
}

const isRetryable = (e: unknown) =>
  e instanceof AiServiceError &&
  (e.status === undefined || e.status === 429 || e.status >= 500);

export class AiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  /** Explicit breaker (tests): shared by every endpoint. Default: one breaker per endpoint group. */
  private readonly sharedBreaker?: CircuitBreaker;
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly sleepFn?: (ms: number) => Promise<void>;

  constructor(opts: Options = {}) {
    this.baseUrl = (
      opts.baseUrl ??
      process.env.AI_SERVICE_URL ??
      "http://localhost:8001"
    ).replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sharedBreaker = opts.breaker;
    this.sleepFn = opts.sleepFn;
  }

  /**
   * Isolated per endpoint group ("search", "valuation", "embed"...): an outage of the valuation
   * chat model must not cut off search, which only needs embeddings.
   */
  breakerFor(path: string): CircuitBreaker {
    if (this.sharedBreaker) return this.sharedBreaker;
    const group = path.split("/")[1] ?? "";
    let b = this.breakers.get(group);
    if (!b) {
      b = new CircuitBreaker();
      this.breakers.set(group, b);
    }
    return b;
  }

  private async post<T>(
    path: string,
    body: unknown,
    { timeoutMs, retries }: { timeoutMs: number; retries: number }
  ): Promise<T> {
    const breaker = this.breakerFor(path);
    try {
      breaker.beforeCall();
    } catch (e) {
      if (e instanceof CircuitOpenError) {
        throw new AiServiceError("AI service circuit open", 503, true);
      }
      throw e;
    }

    const once = async (): Promise<T> => {
      let res: Response;
      try {
        res = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (e) {
        throw new AiServiceError(
          `AI service unreachable: ${(e as Error).message}`,
          undefined,
          true
        );
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new AiServiceError(
          `AI service ${res.status}: ${text.slice(0, 200)}`,
          res.status,
          res.status >= 500
        );
      }
      return (await res.json()) as T;
    };

    try {
      const out = await withRetry(once, {
        retries,
        baseMs: 200,
        isRetryable,
        sleepFn: this.sleepFn,
      });
      breaker.onSuccess();
      return out;
    } catch (e) {
      // 4xx is the caller's fault, not an outage: don't trip the breaker.
      if (
        e instanceof AiServiceError &&
        e.status !== undefined &&
        e.status < 500 &&
        e.status !== 429
      ) {
        breaker.onSuccess();
      } else {
        breaker.onFailure();
      }
      throw e;
    }
  }

  embed(text: string, feature = "embed") {
    return this.post<EmbedResult>(
      "/embed",
      { text, feature },
      { timeoutMs: 30_000, retries: 3 }
    );
  }

  embedBatch(texts: string[], feature = "backfill") {
    return this.post<{
      embeddings: number[][];
      provider: string;
      model: string;
      dimensions: number;
      tokens: number;
    }>("/embed/batch", { texts, feature }, { timeoutMs: 60_000, retries: 3 });
  }

  search(input: {
    query: string;
    limit: number;
    offset: number;
    mode: SearchMode;
  }) {
    return this.post<SearchResult>("/search", input, {
      timeoutMs: 4_000,
      retries: 1,
    });
  }

  similar(auctionId: string, limit: number) {
    return this.post<{ hits: SearchHit[] }>(
      `/similar/${auctionId}`,
      { limit },
      { timeoutMs: 4_000, retries: 1 }
    );
  }

  valuation(input: { title: string; description: string; category?: string }) {
    return this.post<ValuationResult>("/valuation", input, {
      timeoutMs: 20_000,
      retries: 1,
    });
  }

  scoreBid(bidId: string) {
    return this.post<FraudScore>(
      "/fraud/score",
      { bid_id: bidId },
      { timeoutMs: 10_000, retries: 2 }
    );
  }

  investigate(input: {
    bid_id: string;
    score: number;
    features: Record<string, unknown>;
  }) {
    return this.post<Verdict>("/investigate", input, {
      timeoutMs: 120_000,
      retries: 0,
    });
  }

  async health(): Promise<{ status: string; embedding_provider: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    return (await res.json()) as { status: string; embedding_provider: string };
  }
}

export interface ValuationResult {
  status: "ok" | "insufficient_data" | "no_comparables" | "single_seller";
  category: string | null;
  n: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
  comparables: { id: string; title: string; price: number; distance: number }[];
  explanation: string | null;
  suggested_starting_price: number | null;
}

export interface FraudScore {
  bid_id: string;
  auction_id: string;
  user_id: string;
  score: number;
  flagged: boolean;
  features: Record<string, number>;
  contributions: Record<string, number>;
}

export interface Verdict {
  verdict: "suspicious" | "benign" | "inconclusive";
  confidence: number;
  evidence: string[];
  reasoning: string;
  turns: number;
  cost_usd: number;
  aborted_reason: string | null;
}

export const aiClient = new AiClient();
