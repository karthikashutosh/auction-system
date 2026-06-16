import { useQuery } from "@tanstack/react-query";
import { getAuctionById } from "../api/auctions";

export interface Auction {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  image_key: string;
  imageUrl: string;

  starting_price: string;
  current_price: string;
  reserve_price: string;

  start_time: string;
  end_time: string;

  status: string;

  created_at: string;
  updated_at: string;
}

export const useGetAuctionById = (id: string) => {
  return useQuery<Auction>({
    queryFn: () => getAuctionById(id),
    queryKey: ["auction", id],
    enabled: !!id,
  });
};
