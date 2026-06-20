import { CreateAuctionApiInput } from "@repo/shared";
import { getSignedImageUrl } from "../config";
import { db } from "../db";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import {
  addAuction,
  getAuctionById,
  getAuctionCount,
  getAuctions,
  getBidsHistoryRepository,
  getCountBidsHistory,
  getValidAuctionById,
  placeNewBid,
  updateAuctionRepository,
} from "./auctions.repository";
import { send } from "../realtime/sse-manager";
import fastify from "fastify";

interface GetAuctionsInput {
  limit: number;
  page: number;
}

export interface BidHistoryInput extends GetAuctionsInput {
  userId: string;
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
    throw new ForbiddenError(
      "Image does not belong to user",
      "IMAGE_ACCESS_DENIED"
    );
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

export const getAuctionByIdService = async (
  data: Omit<PlaceBidServiceRequest, "bidAmount">
) => {
  const { auctionId, userId } = data;
  const result = await getAuctionById({ auctionId, userId });
  const imageUrl = await getSignedImageUrl(result.image_key);
  const isAuctionEnded = new Date(result.end_time).getTime() <= Date.now();
  return {
    ...result,
    imageUrl,
    starting_price: Number(result.starting_price),
    current_price: Number(result.current_price),
    reserve_price: Number(result.reserve_price),
    total_bids: Number(result.total_bids),
    participated_users: Number(result.participated_users),
    status: isAuctionEnded ? "ENDED" : result.status,
  };
};

export const placeBidService = async (
  data: PlaceBidServiceRequest & { userName: string }
) => {
  const { auctionId, bidAmount, userId, userName } = data;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const validAuction = await getValidAuctionById({
      client,
      auctionInput: {
        auctionId,
      },
    });

    const minimumBid = validAuction.current_price + 100;

    if (!validAuction) {
      throw new NotFoundError("Auction not found", "AUCTION_NOT_FOUND");
    }

    if (validAuction.status !== "ACTIVE") {
      throw new BadRequestError("Auction ended", "AUCTION_ENDED");
    }

    if (bidAmount < minimumBid) {
      throw new BadRequestError(
        "Bid amount must be at least ₹100 higher than the current bid",
        "BID_AMOUNT_TOO_LOW"
      );
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

    send({
      auctionId,
      payload: {
        type: "NEW_BID",
        ...newBid,
        name: userName,
      },
    });
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

export const getBidsHistoryService = async (data: BidHistoryInput) => {
  const { userId, page, limit } = data;
  const offset = (page - 1) * limit;

  const [count, items] = await Promise.all([
    getCountBidsHistory({ userId }),
    getBidsHistoryRepository({
      userId,
      limit,
      offset,
    }),
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
