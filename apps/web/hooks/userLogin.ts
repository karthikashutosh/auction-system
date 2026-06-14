import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, userLogin } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

export const useLogin = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: userLogin,

    onSuccess: async () => {
      const user = await queryClient.fetchQuery({
        queryKey: ["me"],
        queryFn: getUserProfile,
      });

      setUser(user);
    },
  });
};
