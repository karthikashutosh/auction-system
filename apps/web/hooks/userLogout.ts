import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userlogout } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

export const useLogout = () => {
  const queryClient = useQueryClient();

  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: userlogout,

    onSuccess: () => {
      setUser(null);

      queryClient.removeQueries({
        queryKey: ["me"],
      });
    },
  });
};
