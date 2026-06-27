import { GetPresignedUrlPayload } from "@repo/types";
import { api } from "./axios";

export const uploadSignedUrl = async (payload: GetPresignedUrlPayload) => {
  const result = await api.post("/uploads/presigned-url", payload);
  return result;
};
