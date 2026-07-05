import { GetAuctionsInput } from "@repo/types";
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
  cursor,
}: {
  id: string;
  limit: number;
  cursor: GetAuctionsInput["cursor"];
}) => {
  if (!cursor) {
    const query = `SELECT * FROM auctions WHERE owner_id = $1 ORDER BY start_time DESC,id DESC LIMIT $2`;
    const response = await db.query(query, [id, limit]);
    return response.rows;
  }

  const result = await db.query(
    `SELECT *
FROM auctions
WHERE owner_id = $1
  AND (
    start_time < $2
    OR (
      start_time = $2
      AND id < $3
    )
  )
ORDER BY start_time DESC, id DESC
LIMIT $4`,
    [id, cursor.startTime, cursor.id, limit]
  );

  return result.rows;
};

export const getMyAuctionCount = async (id: string) => {
  const result = await db.query(
    `SELECT COUNT(*) FROM auctions WHERE owner_id = $1`,
    [id]
  );

  const toatl = Number(result.rows[0].count);

  return toatl;
};
