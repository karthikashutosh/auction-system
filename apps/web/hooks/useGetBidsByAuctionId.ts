import { useQuery } from "@tanstack/react-query";
import { api } from "../api/axios";

interface GetBidsParams {
  limit?: number;
  page?: number;
}

export const useGetBidsByAuctionId = ({
  limit = 10,
  page = 0,
}: GetBidsParams) => {
  return useQuery({
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
