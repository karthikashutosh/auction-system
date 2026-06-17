import { useQuery } from "@tanstack/react-query";
import { getMyauctions } from "../api/auctions";
import { AuctionsResponse } from "./useGetAllAuctions";

type UseMyAuctionsProps = {
  page: number;
  limit: number;
};

export const useMyAuctions = ({ page, limit }: UseMyAuctionsProps) => {
  return useQuery<AuctionsResponse>({
    queryKey: ["my-auctions", page, limit],

    queryFn: () =>
      getMyauctions({
        page,
        limit,
      }),
  });
};
