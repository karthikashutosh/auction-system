import { useInfiniteQuery } from "@tanstack/react-query";
import { searchAuctions } from "../api/search";

export const useSearchAuctions = (q: string, limit = 12) => {
  return useInfiniteQuery({
    queryKey: ["auction-search", q, limit],
    enabled: q.trim().length > 0,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => searchAuctions({ q, page: pageParam, limit }),
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.page + 1 : undefined,
    staleTime: 30_000,
  });
};
