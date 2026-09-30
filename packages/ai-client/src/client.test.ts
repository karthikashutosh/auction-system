import { describe, expect, it, vi } from "vitest";
import { AiClient } from "./client";
import { CircuitBreaker } from "./resilience";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const noSleep = async () => {};

describe("AiClient", () => {
  it("retries 503 then succeeds", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("down", { status: 503 }))
      .mockResolvedValueOnce(ok({ hits: [], mode: "hybrid", query: "q", total_candidates: 0 }));
    const c = new AiClient({ baseUrl: "http://x", fetchImpl: f as unknown as typeof fetch, sleepFn: noSleep });
    const r = await c.search({ query: "q", limit: 5, offset: 0, mode: "hybrid" });
    expect(r.hits).toEqual([]);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("returns a clean unavailable error when the service is down", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const c = new AiClient({ baseUrl: "http://x", fetchImpl: f as unknown as typeof fetch, sleepFn: noSleep });
    await expect(c.search({ query: "q", limit: 5, offset: 0, mode: "hybrid" })).rejects.toMatchObject({
      unavailable: true,
    });
  });

  it("opens the breaker and then fast-fails without calling fetch", async () => {
    const f = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const c = new AiClient({
      baseUrl: "http://x",
      fetchImpl: f as unknown as typeof fetch,
      sleepFn: noSleep,
      breaker: new CircuitBreaker(2, 60_000),
    });
    for (let i = 0; i < 2; i++) await c.similar("id", 3).catch(() => {});
    const calls = f.mock.calls.length;
    await expect(c.similar("id", 3)).rejects.toMatchObject({ status: 503 });
    expect(f.mock.calls.length).toBe(calls);
  });

  it("does not trip the breaker on 4xx", async () => {
    const f = vi.fn().mockResolvedValue(new Response("bad", { status: 422 }));
    const c = new AiClient({ baseUrl: "http://x", fetchImpl: f as unknown as typeof fetch, sleepFn: noSleep });
    for (let i = 0; i < 10; i++) await c.similar("id", 3).catch(() => {});
    expect(c.breakerFor("/similar/x").state).toBe("closed");
  });

  it("isolates breakers per endpoint: valuation outages do not cut off search", async () => {
    const f = vi.fn().mockImplementation(async (url: string) =>
      url.includes("/valuation")
        ? new Response("llm down", { status: 502 })
        : new Response(JSON.stringify({ hits: [], mode: "hybrid", query: "q", total_candidates: 0 }), { status: 200 })
    );
    const c = new AiClient({ baseUrl: "http://x", fetchImpl: f as unknown as typeof fetch, sleepFn: noSleep });
    for (let i = 0; i < 6; i++) await c.valuation({ title: "t", description: "d" }).catch(() => {});
    expect(c.breakerFor("/valuation").state).toBe("open");
    await expect(c.search({ query: "q", limit: 5, offset: 0, mode: "hybrid" })).resolves.toMatchObject({ hits: [] });
  });
});
