import { useQuery } from "@tanstack/react-query";
import { getAllAuctions } from "../api/auctions";
import { number } from "framer-motion";

export interface Auction {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  image_key: string | null;
  starting_price: string;
  current_price: string;
  reserve_price: string;
  start_time: string;
  end_time: string;
  status: string;
  highest_bidder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionsResponse {
  items: Auction[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const useGetAuctions = ({
  limit = 10,
  page = 1,
}: {
  limit: number;
  page: number;
}) => {
  return useQuery<AuctionsResponse, Error>({
    queryKey: ["auctions", limit, page],
    queryFn: () => getAllAuctions(limit, page),
  });
};
