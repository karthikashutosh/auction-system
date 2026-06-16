import { useQuery } from "@tanstack/react-query";
import { getAllAuctions } from "../api/auctions";

interface Auction {
  id: string;
  title: string;
  currentBid: string;
  bids: number;
  status: string;
}

interface AuctionsResponse {
  items: Auction[];
  totalItems: number;
  limit: number;
  offset: number;
}

export const useGetAuctions = ({
  limit = 20,
  offset = 0,
}: {
  limit: number;
  offset: number;
}) => {
  return useQuery<AuctionsResponse, Error>({
    queryKey: ["auctions", limit, offset],
    queryFn: () => getAllAuctions(limit, offset),
  });
};
