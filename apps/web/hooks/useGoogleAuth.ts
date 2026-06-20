import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/axios";
import { useRouter } from "next/navigation";

export const googleLogin = async (token: string | null) => {
  const response = await api.post("/auth/google", {
    token,
  });

  return response.data;
};

export const useGoogleLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: googleLogin,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["me"],
      });
      router.push("/");
    },
  });
};
