import { AuctionsResponse } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { getAllAuctions } from "../api/auctions";
import { useAuthStore } from "../store/auth.store";

export const useGetAuctions = ({
  limit = 10,
  page = 1,
}: {
  limit: number;
  page: number;
}) => {
  const user = useAuthStore((state) => state.user);
  return useQuery<AuctionsResponse, Error>({
    queryKey: ["auctions", limit, page],
    queryFn: () => getAllAuctions(limit, page),
    enabled: !!user,
  });
};
