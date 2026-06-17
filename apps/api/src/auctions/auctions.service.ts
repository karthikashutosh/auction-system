import { CreateAuctionApiInput } from "@repo/shared";
import {
  addAuction,
  getAuctionById,
  getAuctionCount,
  getAuctions,
  getValidAuctionById,
  placeNewBid,
  updateAuctionRepository,
} from "./auctions.repository";
import { getSignedImageUrl } from "../config";
import { Pool } from "pg";
import { db } from "../db";
import { error } from "console";

interface GetAuctionsInput {
  limit: number;
  page: number;
}

export interface PlaceBidServiceRequest {
  auctionId: string;
  userId: string;
  bidAmount: number;
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
  const { limit, page } = query;

  const offset = (page - 1) * limit;

  const [count, items] = await Promise.all([
    getAuctionCount(),
    getAuctions({ limit, offset }),
  ]);

  const totalPages = Math.ceil(count / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
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

export const placeBidService = async (data: PlaceBidServiceRequest) => {
  const { auctionId, bidAmount, userId } = data;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const validAuction = await getValidAuctionById({
      client,
      auctionInput: {
        auctionId,
      },
    });

    if (!validAuction) throw new Error("Auction is Not Exist");

    const minimumBid = validAuction.current_price + 100;

    if (validAuction.status !== "ACTIVE") throw new Error("Auction Ended");

    if (validAuction.owner_id === userId) {
      throw new Error("Auction owner cannot place Bid");
    }

    if (bidAmount < minimumBid) {
      throw new Error("Bid Amount Should Minimum 100rs more than Current bid");
    }

    const newBid = await placeNewBid({
      client,
      auctionInput: {
        auctionId,
        bidAmount,
        userId,
      },
    });
    await updateAuctionRepository({
      client,
      auctionInput: {
        auctionId,
        bidAmount,
        userId,
      },
    });

    await client.query("COMMIT");
    return {
      id: newBid.id,
      bidAmount,
      userId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
