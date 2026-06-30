import { CreateAuctionApiInput } from "@repo/shared";
import {
  BadRequestError,
  BidHistoryInput,
  ForbiddenError,
  GetAuctionsInput,
  NotFoundError,
  PlaceBidServiceRequest,
} from "@repo/types";
import { getSignedImageUrl } from "../config";

import {
  addAuction,
  db,
  getAuctionById,
  getAuctionCount,
  getAuctions,
  getBidsHistoryRepository,
  getCountBidsHistory,
  getValidAuctionById,
  placeNewBid,
  updateAuctionRepository,
} from "@repo/db";
import { auctionQueue } from "@repo/queue";
import { publish } from "@repo/redis";
import { PoolClient } from "pg";

export interface ValidAuction {
  client: PoolClient;
  auctionInput: PlaceBidServiceRequest;
}

export interface ValidAuctionById {
  client: PoolClient;
  auctionInput: Pick<PlaceBidServiceRequest, "auctionId">;
}

export const createAuctionService = async (
  userId: string,
  data: CreateAuctionApiInput,
) => {
  const { description, endDate, imageKey, reservePrice, startingPrice, title } =
    data;

  if (!imageKey.startsWith(`users/${userId}/`)) {
    throw new ForbiddenError(
      "Image does not belong to user",
      "IMAGE_ACCESS_DENIED",
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

  await auctionQueue.add(
    "auction-expiry",
    {
      auctionId: response.id,
    },
    {
      jobId: `auction-expiry-${response.id}`,
      delay: new Date(endDate).getTime() - Date.now(),
    },
  );

  return {
    id: response.id,
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
  data: Omit<PlaceBidServiceRequest, "bidAmount">,
) => {
  const { auctionId, userId } = data;
  const result = await getAuctionById({ auctionId, userId });
  const imageUrl = await getSignedImageUrl(result.image_key);
  return {
    ...result,
    imageUrl,
    starting_price: Number(result.starting_price),
    current_price: Number(result.current_price),
    reserve_price: Number(result.reserve_price),
    total_bids: Number(result.total_bids),
    participated_users: Number(result.participated_users),
  };
};

export const placeBidService = async (
  data: PlaceBidServiceRequest & { userName: string },
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

    if (!validAuction) {
      throw new NotFoundError("Auction not found", "AUCTION_NOT_FOUND");
    }

    const minimumBid = validAuction.current_price + 100;

    if (validAuction.status !== "ACTIVE") {
      throw new BadRequestError("Auction ended", "AUCTION_ENDED");
    }

    if (bidAmount < minimumBid) {
      throw new BadRequestError(
        "Bid amount must be at least ₹100 higher than the current bid",
        "BID_AMOUNT_TOO_LOW",
      );
    }

    if (validAuction.sellerId === userId) {
      throw new BadRequestError(
        "You cannot bid on your own auction",
        "SELF_BIDDING_NOT_ALLOWED",
      );
    }

    if (new Date() > validAuction.endTime) {
      throw new BadRequestError("Auction has ended", "AUCTION_ENDED");
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

    await publish("auction-events", {
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
