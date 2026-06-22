import { useMutation } from "@tanstack/react-query";
import { userLogin } from "../api/auth.api";

export const useLogin = () => {
  return useMutation({
    mutationFn: userLogin,
  });
};
