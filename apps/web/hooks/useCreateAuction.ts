import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/axios";
import { notify } from "../app/lib/notify";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: CreateAuctionPayload
    ): Promise<CreateAuctionResponse> => {
      const { data } = await api.post("/auctions", payload);

      return data;
    },
    onSuccess: () => {
      notify.success("Auction Created Successfully");
      queryClient.invalidateQueries({
        queryKey: ["auctions"],
      });
    },
  });
};
