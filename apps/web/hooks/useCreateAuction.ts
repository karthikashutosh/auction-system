import { useMutation, QueryClient } from "@tanstack/react-query";
import { api } from "../api/axios";

export interface CreateAuctionPayload {
  title: string;
  description: string;
  startingPrice: number;
  reservePrice: number;
  endDate: string;
  imageKey: string;
}

export interface CreateAuctionResponse {
  id: string;
  message: string;
}

export const useCreateAuction = () => {
  const queryClient = new QueryClient();
  return useMutation({
    mutationFn: async (
      payload: CreateAuctionPayload
    ): Promise<CreateAuctionResponse> => {
      const { data } = await api.post("/auctions", payload);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["auctions"],
      });
    },
  });
};
