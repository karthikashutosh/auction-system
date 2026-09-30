export class CircuitOpenError extends Error {
  constructor() {
    super("circuit breaker is open");
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly threshold = 5,
    private readonly resetMs = 15_000,
    private readonly now: () => number = Date.now
  ) {}

  get state(): "closed" | "open" | "half_open" {
    if (this.openedAt === null) return "closed";
    return this.now() - this.openedAt >= this.resetMs ? "half_open" : "open";
  }

  beforeCall() {
    if (this.state === "open") throw new CircuitOpenError();
  }

  onSuccess() {
    this.failures = 0;
    this.openedAt = null;
  }

  onFailure() {
    this.failures += 1;
    if (this.state === "half_open" || this.failures >= this.threshold) {
      this.openedAt = this.now();
    }
  }
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with full jitter. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    retries: number;
    baseMs: number;
    isRetryable: (e: unknown) => boolean;
    sleepFn?: (ms: number) => Promise<void>;
    rand?: () => number;
  }
): Promise<T> {
  const { retries, baseMs, isRetryable, sleepFn = sleep, rand = Math.random } =
    opts;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries || !isRetryable(e)) throw e;
      await sleepFn(rand() * baseMs * 2 ** attempt);
    }
  }
}
