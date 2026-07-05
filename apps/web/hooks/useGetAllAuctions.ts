import { useInfiniteQuery } from "@tanstack/react-query";
import { getAllAuctions } from "../api/auctions";

export const useGetAuctions = (limit = 10) => {
  return useInfiniteQuery({
    queryKey: ["auctions", limit],

    initialPageParam: undefined as
      | {
          startTime: string;
          id: string;
        }
      | undefined,

    queryFn: ({ pageParam }) =>
      getAllAuctions({
        limit,
        cursor: pageParam,
      }),

    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.nextCursor
        : undefined,
  });
};
