import { AuctionsResponse, SearchResponse, ValuationResponse } from "@repo/types";
import { api } from "./axios";

export const searchAuctions = async (params: {
  q: string;
  page: number;
  limit: number;
}) => {
  const response = await api.get<SearchResponse>("/auctions/search", {
    params,
  });
  return response.data;
};

export const getSimilarAuctions = async (id: string) => {
  const response = await api.get<Pick<AuctionsResponse, "items">>(
    `/auctions/${id}/similar`
  );
  return response.data;
};

export const getValuation = async (payload: {
  title: string;
  description: string;
}) => {
  const response = await api.post<ValuationResponse>(
    "/auctions/valuation",
    payload
  );
  return response.data;
};
