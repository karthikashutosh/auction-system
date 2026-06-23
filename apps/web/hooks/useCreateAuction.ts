import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/axios";
import { notify } from "../app/lib/notify";
import { CreateAuctionPayload, CreateAuctionResponse } from "@repo/types";

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
      notify.success({ title: "Auction Created Successfully" });
      queryClient.invalidateQueries({
        queryKey: ["auctions"],
      });
    },
  });
};
