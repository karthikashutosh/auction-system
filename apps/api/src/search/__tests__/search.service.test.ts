import { AiServiceError, aiClient } from "@repo/ai-client";
import { getAuctionsByIds } from "@repo/db";
import { describe, expect, it, vi } from "vitest";
import {
  searchAuctionsService,
  similarAuctionsService,
} from "../search.service";

vi.mock("@repo/ai-client", async () => {
  const actual = await vi.importActual<typeof import("@repo/ai-client")>(
    "@repo/ai-client"
  );
  return { ...actual, aiClient: { search: vi.fn(), similar: vi.fn() } };
});

vi.mock("@repo/db", async () => {
  const actual = await vi.importActual<typeof import("@repo/db")>("@repo/db");
  return { ...actual, getAuctionsByIds: vi.fn() };
});

const hit = (id: string, score: number) => ({
  id,
  score,
  distance: null,
  vector_rank: null,
  lexical_rank: null,
});

describe("searchAuctionsService", () => {
  it("returns an empty page for an empty query without calling the AI service", async () => {
    const r = await searchAuctionsService({ q: "", mode: "hybrid", limit: 10, page: 1 });
    expect(r.items).toEqual([]);
    expect(aiClient.search).not.toHaveBeenCalled();
  });

  it("hydrates records in ranked order and reports hasNextPage", async () => {
    vi.mocked(aiClient.search).mockResolvedValue({
      hits: [hit("b", 0.9), hit("a", 0.5), hit("c", 0.1)],
      mode: "hybrid",
      query: "cam",
      total_candidates: 3,
    });
    vi.mocked(getAuctionsByIds).mockResolvedValue([{ id: "b" }, { id: "a" }] as never);

    const r = await searchAuctionsService({ q: "cam", mode: "hybrid", limit: 2, page: 1 });

    expect(aiClient.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 3, offset: 0 }));
    expect(getAuctionsByIds).toHaveBeenCalledWith(["b", "a"]);
    expect(r.items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(r.pagination.hasNextPage).toBe(true);
  });

  it("maps an unavailable AI service to a clean 503", async () => {
    vi.mocked(aiClient.search).mockRejectedValue(new AiServiceError("down", undefined, true));
    await expect(
      searchAuctionsService({ q: "cam", mode: "hybrid", limit: 5, page: 1 })
    ).rejects.toMatchObject({ statusCode: 503, code: "SEARCH_UNAVAILABLE" });
  });
});

describe("similarAuctionsService", () => {
  it("treats 'no embedding yet' (404) as an empty list, not an error", async () => {
    vi.mocked(aiClient.similar).mockRejectedValue(new AiServiceError("nf", 404));
    await expect(similarAuctionsService("x", 6)).resolves.toEqual({ items: [] });
  });
});
