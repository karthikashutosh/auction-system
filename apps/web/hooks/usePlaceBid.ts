import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/axios";
import { notify } from "../app/lib/notify";
import { PlaceBidResponse, PlaceBidVariables } from "@repo/types";

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
      notify.success("Bid placed Successfully");
      queryClient.invalidateQueries({
        queryKey: ["auction", variables.auctionId],
      });
    },
  });
};
