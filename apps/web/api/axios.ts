import axios from "axios";
import { useAuthStore } from "../store/auth.store";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?.url === "/auth/refresh") {
      return Promise.reject(error);
    }

    const isUnauthorized =
      error.response?.status === 401 &&
      error.response?.data?.code === "UNAUTHORIZED";

    if (isUnauthorized) {
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        await refershSession();
        return api(originalRequest);
      } catch (refreshError) {
        forceLogout();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const uploadFileToS3 = async (
  uploadUrl: string,
  file: File
): Promise<void> => {
  const response = await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file.type,
    },
  });

  throw new Error(`File upload failed with status ${response.status}`);
};

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ?? error.message ?? "Something went wrong"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

let refreshpromise: Promise<void> | null = null;

export const refershSession = async () => {
  if (!refreshpromise) {
    refreshpromise = api
      .post("/auth/refresh")
      .then(() => {})
      .finally(() => {
        refreshpromise = null;
      });
  }

  return refreshpromise;
};

export function forceLogout() {
  useAuthStore.getState().setUser(null);
  window.location.href = "/login";
}
