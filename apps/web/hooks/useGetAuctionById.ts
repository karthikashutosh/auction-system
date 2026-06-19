import { useQuery } from "@tanstack/react-query";
import { getAuctionById } from "../api/auctions";

export interface AuctionDetail {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  owner_name: string;
  imageUrl: string;
  starting_price: number;
  current_price: number;
  reserve_price: number;

  total_bids: number;
  participated_users: number;

  is_owner: boolean;
  is_highest_bidder: boolean;
  is_reserve_met: boolean;

  status: "ACTIVE" | "ENDED";

  start_time: string;
  end_time: string;

  recent_bids_history: {
    id: string;
    user_id: string;
    amount: number;
    name: string;
    created_at: string;
  }[];
}

export const useGetAuctionById = (id: string) => {
  return useQuery<AuctionDetail>({
    queryFn: () => getAuctionById(id),
    queryKey: ["auction", id],
    enabled: !!id,
  });
};
