import { Client, PoolClient } from "pg";
import { db } from "../db";
import {
  BidHistoryInput,
  CreateAuctionPayload,
  NotificationPayload,
  PlaceBidServiceRequest,
} from "@repo/types";

type UpdateAuctionStatusInput = {
  client: PoolClient;
  auctionId: string;
  status: "ACTIVE" | "ENDED";
  highest_bidder_id: string | null;
};

export interface ValidAuction {
  client: PoolClient;
  auctionInput: PlaceBidServiceRequest;
}

export interface ValidAuctionById {
  client: PoolClient;
  auctionInput: Pick<PlaceBidServiceRequest, "auctionId">;
}

export interface NotificationPayloadWithClient extends NotificationPayload {
  client: PoolClient;
}

export interface CreateAuctionPayloadWithvalid extends Omit<
  CreateAuctionPayload,
  "endDate"
> {
  ownerId: string;
  currentPrice: number;
  startTime: Date;
  endTime: Date;
}

export const addAuction = async (data: CreateAuctionPayloadWithvalid) => {
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

export const getAuctions = async ({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}) => {
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

export const getAuctionById = async (
  data: Omit<PlaceBidServiceRequest, "bidAmount">
) => {
  const { auctionId, userId } = data;
  const query = `WITH bid_stats AS (
  SELECT
    auction_id,
    COUNT(*) AS total_bids,
    COUNT(DISTINCT user_id) AS participated_users
  FROM bids
  WHERE auction_id = $1
  GROUP BY auction_id
),
recent_bids AS (
  SELECT
    rb.auction_id,
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', rb.id,
        'user_id', rb.user_id,
        'name', rb.name,
        'amount', rb.amount,
        'created_at', rb.created_at
      )
      ORDER BY rb.created_at DESC
    ) AS recent_bids_history
  FROM (
    SELECT
      b.id,
      b.auction_id,
      b.user_id,
      u.name,
      b.amount,
      b.created_at
    FROM bids b
    INNER JOIN users u
      ON u.id = b.user_id
    WHERE b.auction_id = $1
    ORDER BY b.created_at DESC
    LIMIT 10
  ) rb
  GROUP BY rb.auction_id
)
SELECT
  a.*,
  COALESCE(bs.total_bids, 0) AS total_bids,
  COALESCE(bs.participated_users, 0) AS participated_users,

  COALESCE(
    rb.recent_bids_history,
    '[]'::json
  ) AS recent_bids_history,
 owner.name AS owner_name,
  (a.owner_id = $2) AS is_owner,
  (a.highest_bidder_id = $2) AS is_highest_bidder,
  (a.current_price >= a.reserve_price) AS is_reserve_met

FROM auctions a

LEFT JOIN users owner
  ON owner.id = a.owner_id

LEFT JOIN bid_stats bs
  ON bs.auction_id = a.id

LEFT JOIN recent_bids rb
  ON rb.auction_id = a.id

WHERE a.id = $1`;
  const response = await db.query(query, [auctionId, userId]);
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

export const updateAuctionStatusRepository = async ({
  client,
  auctionId,
  status,
  highest_bidder_id,
}: UpdateAuctionStatusInput) => {
  const query = `
    UPDATE auctions
    SET
    status = $1,
    highest_bidder_id = $2
    WHERE id = $3
    RETURNING *;
    `;

  const result = await client.query(query, [
    status,
    highest_bidder_id,
    auctionId,
  ]);

  return result.rows[0];
};

export const createNotificationRepository = async (
  data: NotificationPayloadWithClient
) => {
  const { client, userId, title, message, type, entityType, entityId } = data;

  const query = `
    INSERT INTO notifications (
      user_id,
      message,
      title,
      type,
      entity_type,
      entity_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [userId, message, title, type, entityType, entityId];

  const result = await client.query(query, values);

  return result.rows[0];
};

export const getActiveAuctionsRepository = async () => {
  const query = `SELECT id,end_time FROM AUCTIONS WHERE status = 'ACTIVE'`;
  const results = await db.query(query);
  return results.rows;
};
