import { AuctionsResponse } from "@repo/types";
import { api } from "./axios";

type GetAuctionsRequest = {
  limit: number;
  cursor?: {
    startTime: string;
    id: string;
  };
};

export const getAllAuctions = async ({ limit, cursor }: GetAuctionsRequest) => {
  const response = await api.get<AuctionsResponse>("/auctions", {
    params: {
      limit,
      startTime: cursor?.startTime,
      id: cursor?.id,
    },
  });

  return response.data;
};
export const getAuctionById = async (id: string) => {
  const response = await api.get(`/auctions/${id}`);

  return response.data;
};

type GetMyAuctionsRequest = {
  limit: number;
  cursor?: {
    startTime: string;
    id: string;
  };
};

export const getMyAuctions = async ({
  limit,
  cursor,
}: GetMyAuctionsRequest) => {
  const response = await api.get<AuctionsResponse>("/user/me/auctions", {
    params: {
      limit,
      startTime: cursor?.startTime,
      id: cursor?.id,
    },
  });

  return response.data;
};
