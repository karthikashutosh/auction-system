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

    // IMPORTANT
    if (originalRequest.url === "/auth/refresh") {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "UNAUTHORIZED"
    ) {
      try {
        await refershSession();

        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
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
