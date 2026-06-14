import { useMutation } from "@tanstack/react-query";
import { userSignup } from "../api/auth.api";

export const useSignup = () => {
  return useMutation({
    mutationFn: userSignup,
  });
};