import { api } from "./axios";

export const getAllAuctions = async (limit = 20, offset = 0) => {
  const { data } = await api.get("/auctions", {
    params: {
      limit,
      offset,
    },
  });

  return data;
};

export const getAuctionById = async (id: string) => {
  const response = await api.get(`/auctions/${id}`);

  return response.data;
};
