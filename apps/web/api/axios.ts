import axios from "axios";

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

    if (error.response?.status === 401) {
      try {
        await refershSession();

        return api(originalRequest);
      } catch (refreshError) {
        window.location.href = "/login";
        console.log("Refresh Failed");
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

  if (response.status !== 200) {
    throw new Error("Failed to upload file");
  }
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
