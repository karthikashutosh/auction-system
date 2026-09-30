import { useQuery } from "@tanstack/react-query";
import { getValuation } from "../api/search";

export const useValuation = (title: string, description: string) => {
  const ready = title.trim().length >= 3 && description.trim().length >= 20;
  return useQuery({
    queryKey: ["valuation", title, description],
    queryFn: () => getValuation({ title: title.trim(), description: description.trim() }),
    enabled: ready,
    staleTime: 5 * 60_000,
    retry: false,
  });
};
