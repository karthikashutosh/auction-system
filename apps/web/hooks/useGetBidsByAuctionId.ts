import { useQuery } from "@tanstack/react-query";
import { api } from "../api/axios";

import { GetBidsParams, BidsResponse } from "@repo/types";

export const useGetBidsByAuctionId = ({
  limit = 10,
  page = 0,
}: GetBidsParams) => {
  return useQuery<BidsResponse>({
    queryKey: ["bids", limit, page],
    queryFn: async () => {
      const { data } = await api.get(`/auctions/bids/me`, {
        params: {
          limit,
          page,
        },
      });

      return data;
    },
  });
};
