import { useQuery } from "@tanstack/react-query";
import { api } from "../api/axios";

export type BidStatus = "ACTIVE" | "CLOSED" | "PENDING";

export interface BidItem {
  id: string;
  title: string;
  image_key: string;
  bid_amount: string;
  current_price: string;
  status: BidStatus;
  end_time: string;
  bid_time: string;
}

export interface PaginationMeta {
  page: string;
  limit: string;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BidsResponse {
  items: BidItem[];
  pagination: PaginationMeta;
}

interface GetBidsParams {
  limit?: number;
  page?: number;
}

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
