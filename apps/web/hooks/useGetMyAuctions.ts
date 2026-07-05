import { useInfiniteQuery } from "@tanstack/react-query";
import { getMyAuctions } from "../api/auctions";

type Cursor = {
  startTime: string;
  id: string;
};

export const useMyAuctions = (limit = 10) => {
  return useInfiniteQuery({
    queryKey: ["my-auctions", limit],

    initialPageParam: undefined as Cursor | undefined,

    queryFn: ({ pageParam }) =>
      getMyAuctions({
        limit,
        cursor: pageParam,
      }),

    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.nextCursor
        : undefined,
  });
};
