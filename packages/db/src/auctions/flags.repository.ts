import { db } from "../db";

export interface FlagInput {
  auctionId: string;
  bidId: string;
  userId: string;
  score: number;
  features: Record<string, unknown>;
  contributions: Record<string, unknown>;
}

export const insertFlag = async (f: FlagInput) => {
  const r = await db.query(
    `INSERT INTO flagged_auctions (auction_id, bid_id, user_id, score, features, contributions)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (bid_id) DO NOTHING
     RETURNING id`,
    [
      f.auctionId,
      f.bidId,
      f.userId,
      f.score,
      JSON.stringify(f.features),
      JSON.stringify(f.contributions),
    ]
  );
  return r.rows[0] as { id: string } | undefined;
};

export const saveVerdict = async (flagId: string, verdict: unknown) => {
  await db.query(
    `UPDATE flagged_auctions SET verdict = $2, investigated_at = NOW() WHERE id = $1`,
    [flagId, JSON.stringify(verdict)]
  );
};

export const getFlagById = async (id: string) => {
  const r = await db.query(`SELECT * FROM flagged_auctions WHERE id = $1`, [
    id,
  ]);
  return r.rows[0];
};

export const listFlags = async (limit: number, offset: number) => {
  const r = await db.query(
    `SELECT f.id, f.auction_id, f.bid_id, f.user_id, f.score, f.features, f.contributions,
            f.verdict, f.investigated_at, f.created_at, a.title AS auction_title
     FROM flagged_auctions f JOIN auctions a ON a.id = f.auction_id
     ORDER BY f.score DESC, f.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return r.rows;
};

export const flagStats = async () => {
  const r = await db.query(
    `SELECT date_trunc('day', created_at) AS day, count(*)::int AS flags
     FROM flagged_auctions GROUP BY 1 ORDER BY 1 DESC LIMIT 30`
  );
  return r.rows;
};
