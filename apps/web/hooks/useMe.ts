import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "../api/auth.api";

export const useMe = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => await getUserProfile(),
    retry: false,
  });
};
