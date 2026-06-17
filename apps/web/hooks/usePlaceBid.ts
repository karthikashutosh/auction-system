import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/axios";

type PlaceBidPayload = {
  bidAmount: number;
};

type PlaceBidVariables = {
  auctionId: string;
  payload: PlaceBidPayload;
};

type PlaceBidResponse = {
  id: string;
  bidAmount: number;
  userId: string;
};

export const usePlaceBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      auctionId,
      payload,
    }: PlaceBidVariables): Promise<PlaceBidResponse> => {
      const { data } = await api.post(`/auctions/${auctionId}/bids`, payload);

      return data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["auction", variables.auctionId],
      });
    },
  });
};
