import { api } from "./axios";

export const getAllAuctions = async (limit = 10, page = 1) => {
  const { data } = await api.get("/auctions", {
    params: {
      limit,
      page,
    },
  });

  return data;
};

export const getAuctionById = async (id: string) => {
  const response = await api.get(`/auctions/${id}`);

  return response.data;
};

export const getMyauctions = async ({ page = 1, limit = 10 }) => {
  const { data } = await api.get(`/user/me/auctions`, {
    params: {
      limit,
      page,
    },
  });

  return data;
};
