import { CreateAuctionApiInput } from "@repo/shared";
import {
  addAuction,
  getAuctionById,
  getAuctionCount,
  getAuctions,
} from "./auctions.repository";
import { getSignedImageUrl } from "../config";

interface GetAuctionsInput {
  limit: number;
  offset: number;
}

export const createAuctionService = async (
  userId: string,
  data: CreateAuctionApiInput
) => {
  const { description, endDate, imageKey, reservePrice, startingPrice, title } =
    data;

  if (!imageKey.startsWith(`users/${userId}/`)) {
    throw new Error("Image does not belong to user");
  }
  const response = await addAuction({
    ownerId: userId,
    title,
    description,
    imageKey,
    startingPrice,
    currentPrice: startingPrice,
    reservePrice,
    startTime: new Date(),
    endTime: new Date(endDate),
  });

  return {
    id: response.owner_id,
    message: "Auction created successfully",
  };
};

export const getAllAuctionsService = async (query: GetAuctionsInput) => {
  const { limit, offset } = query;

  const [count, items] = await Promise.all([
    getAuctionCount(),
    getAuctions({ limit, offset }),
  ]);

  return {
    items,
    totalItems: count,
    limit,
    offset,
  };
};

export const getAuctionByIdService = async (data) => {
  const result = await getAuctionById(data);
  const imageUrl = await getSignedImageUrl(result.image_key);
  return {
    ...result,
    imageUrl,
  };
};
