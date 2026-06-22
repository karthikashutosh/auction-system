import { useQuery } from "@tanstack/react-query";
import { getAuctionById } from "../api/auctions";
import { AuctionDetail } from "@repo/types";

export const useGetAuctionById = (id: string) => {
  return useQuery<AuctionDetail>({
    queryFn: () => getAuctionById(id),
    queryKey: ["auction", id],
    enabled: !!id,
  });
};
