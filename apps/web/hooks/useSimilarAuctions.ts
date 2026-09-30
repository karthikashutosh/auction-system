import { useQuery } from "@tanstack/react-query";
import { getSimilarAuctions } from "../api/search";

export const useSimilarAuctions = (id: string) =>
  useQuery({
    queryKey: ["auction-similar", id],
    queryFn: () => getSimilarAuctions(id),
    enabled: !!id,
    staleTime: 5 * 60_000,
    retry: false,
  });
