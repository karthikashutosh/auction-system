import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userLogin } from "../api/auth.api";

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userLogin,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["me"],
      });
    },
  });
};