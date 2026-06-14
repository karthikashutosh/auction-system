import { db } from "../db";

export async function findById(id: string) {
  const results = await db.query(`SELECT * FROM users WHERE id =$1 LIMIT 1`, [
    id,
  ]);
  return results.rows[0];
}
