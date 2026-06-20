import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userlogout } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { useRouter } from "next/navigation";

export const useLogout = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: userlogout,

    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      router.replace("/login");
    },
  });
};
