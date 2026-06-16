import { useMutation } from "@tanstack/react-query";
import { uploadSignedUrl } from "../api/uploads.api";

export interface GetPresignedUrlPayload {
  fileName: string;
  contentType: string;
}

export interface GetPresignedUrlResponse {
  uploadUrl: string;
  key: string;
  //   imageUrl: string;
}

export const useGetPresignedUrl = () => {
  return useMutation({
    mutationFn: async (
      payload: GetPresignedUrlPayload
    ): Promise<GetPresignedUrlResponse> => {
      const { data } = await uploadSignedUrl(payload);

      return data;
    },
  });
};
