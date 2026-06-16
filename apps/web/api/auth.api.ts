import { api } from "./axios";

import type { LoginDto, SignupDto } from "@repo/shared";

export const userSignup = async (data: SignupDto) => {
  const response = await api.post("/auth/signup", data);

  return response.data;
};

export const userLogin = async (data: LoginDto) => {
  const response = await api.post("/auth/login", data);

  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get("/user/me");

  return response.data;
};

export const userlogout = async () => {
  const response = await api.post("/user/logout");

  return response.data;
};
