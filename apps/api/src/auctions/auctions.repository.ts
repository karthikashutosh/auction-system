import { PoolClient } from "pg";
import { db } from "../db";
import { BidHistoryInput, PlaceBidServiceRequest } from "./auctions.service";

export interface ValidAuction {
  client: PoolClient;
  auctionInput: PlaceBidServiceRequest;
}

export interface ValidAuctionById {
  client: PoolClient;
  auctionInput: Pick<PlaceBidServiceRequest, "auctionId">;
}

export const addAuction = async (data) => {
  const query = `INSERT INTO auctions(owner_id, title, description, image_key, starting_price, current_price, reserve_price, start_time, end_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
  const values = [
    data.ownerId,
    data.title,
    data.description,
    data.imageKey,
    data.startingPrice,
    data.currentPrice,
    data.reservePrice,
    data.startTime,
    data.endTime,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

export const getAuctions = async ({ limit, offset }) => {
  const query = `SELECT * FROM auctions ORDER BY start_time DESC LIMIT $1 OFFSET $2`;
  const response = await db.query(query, [limit, offset]);
  return response.rows;
};

export const getAuctionCount = async () => {
  const query = `SELECT COUNT(*) FROM auctions`;
  const response = await db.query(query);
  const total = Number(response.rows[0].count);
  return total;
};

export const getAuctionById = async (id) => {
  const query = `SELECT * FROM auctions WHERE id = $1 LIMIT 1`;
  const response = await db.query(query, [id]);
  return response.rows[0];
};

export const getValidAuctionById = async (data: ValidAuctionById) => {
  const {
    client,
    auctionInput: { auctionId },
  } = data;

  const query = `SELECT * FROM auctions WHERE id =$1 FOR UPDATE`;

  const result = await client.query(query, [auctionId]);

  return result.rows[0];
};

export const placeNewBid = async (data: ValidAuction) => {
  const {
    client,
    auctionInput: { auctionId, bidAmount, userId },
  } = data;

  const query = `INSERT INTO bids (user_id,auction_id,amount) VALUES($1, $2, $3) RETURNING *`;
  const result = await client.query(query, [userId, auctionId, bidAmount]);
  return result.rows[0];
};

export const updateAuctionRepository = async (data: ValidAuction) => {
  const {
    client,
    auctionInput: { auctionId, bidAmount, userId },
  } = data;

  const query = `UPDATE auctions SET current_price = $1, highest_bidder_id = $2 WHERE id = $3`;
  const result = await client.query(query, [bidAmount, userId, auctionId]);
  return result.rows[0];
};

export const getBidsHistoryRepository = async (
  data: Omit<BidHistoryInput, "page"> & { offset: number }
) => {
  const { userId, limit, offset } = data;

  const query = `SELECT a.id,
  a.title,
  a.image_key,
  b.amount AS bid_amount,
  a.current_price,
  a.status,
  a.end_time,
  b.created_at AS bid_time FROM bids b INNER JOIN auctions a ON b.auction_id = a.id WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`;

  const result = await db.query(query, [userId, limit, offset]);

  return result.rows;
};

export const getCountBidsHistory = async ({ userId }: { userId: string }) => {
  const query = `SELECT COUNT(*) FROM bids WHERE user_id = $1`;
  const result = await db.query(query, [userId]);
  const total = Number(result.rows[0].count);
  return total;
};
