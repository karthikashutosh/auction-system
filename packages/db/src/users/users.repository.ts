import { db } from "../db";

export async function findById(id: string) {
  const results = await db.query(`SELECT * FROM users WHERE id =$1 LIMIT 1`, [
    id,
  ]);
  return results.rows[0];
}

export const getMyAuctionRepository = async ({
  id,
  limit,
  offset,
}: {
  id: string;
  limit: number;
  offset: number;
}) => {
  const result = await db.query(
    `SELECT *
FROM auctions
WHERE owner_id = $1
ORDER BY start_time DESC
LIMIT $2
OFFSET $3`,
    [id, limit, offset],
  );

  return result.rows;
};

export const getMyAuctionCount = async (id: string) => {
  const result = await db.query(
    `SELECT COUNT(*) FROM auctions WHERE owner_id = $1`,
    [id],
  );

  const toatl = Number(result.rows[0].count);

  return toatl;
};
