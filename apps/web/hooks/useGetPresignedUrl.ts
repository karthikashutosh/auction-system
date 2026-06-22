import { useMutation } from "@tanstack/react-query";
import { uploadSignedUrl } from "../api/uploads.api";
import { GetPresignedUrlPayload, GetPresignedUrlResponse } from "@repo/types";

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
