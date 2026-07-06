import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userlogout } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { useRouter } from "next/navigation";

export const useLogout = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const logOut = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: userlogout,
    onSuccess: () => {
      logOut();
      router.replace("/login");
    },
  });
};
