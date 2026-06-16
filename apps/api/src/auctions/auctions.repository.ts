import { db } from "../db";

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
