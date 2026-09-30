import { AiServiceError, aiClient, SearchMode } from "@repo/ai-client";
import { getAuctionsByIds } from "@repo/db";
import { ServiceUnavailableError } from "@repo/types";

const unavailable = (e: unknown): never => {
  if (e instanceof AiServiceError && (e.unavailable || (e.status ?? 0) >= 500)) {
    throw new ServiceUnavailableError(
      "Search is temporarily unavailable",
      "SEARCH_UNAVAILABLE"
    );
  }
  throw e;
};

export const searchAuctionsService = async (input: {
  q: string;
  mode: SearchMode;
  limit: number;
  page: number;
}) => {
  const { q, mode, limit, page } = input;
  if (!q) {
    return { items: [], pagination: { page, limit, hasNextPage: false }, query: q };
  }
  try {
    // Ask for one extra to learn whether a next page exists.
    const res = await aiClient.search({
      query: q,
      mode,
      limit: limit + 1,
      offset: (page - 1) * limit,
    });
    const hasNextPage = res.hits.length > limit;
    const hits = hasNextPage ? res.hits.slice(0, limit) : res.hits;
    // Node owns the records: hydrate from our own repository, keep the ranking.
    const items = await getAuctionsByIds(hits.map((h) => h.id));
    const score = new Map(hits.map((h) => [h.id, h.score]));
    return {
      items: items.map((a) => ({ ...a, search_score: score.get(a.id) })),
      pagination: { page, limit, hasNextPage },
      query: res.query,
    };
  } catch (e) {
    return unavailable(e);
  }
};

export const similarAuctionsService = async (auctionId: string, limit: number) => {
  try {
    const res = await aiClient.similar(auctionId, limit);
    const items = await getAuctionsByIds(res.hits.map((h) => h.id));
    return { items };
  } catch (e) {
    // A listing with no embedding yet simply has no neighbours: not an error.
    if (e instanceof AiServiceError && e.status === 404) return { items: [] };
    return unavailable(e);
  }
};

export const valuationService = async (input: {
  title: string;
  description: string;
  category?: string;
}) => {
  try {
    return await aiClient.valuation(input);
  } catch (e) {
    return unavailable(e);
  }
};
