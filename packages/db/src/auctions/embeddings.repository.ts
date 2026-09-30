import { db } from "../db";
import { AUCTION_COLUMNS } from "./auctions.repository";

export const toPgVector = (v: number[]) => `[${v.join(",")}]`;

export const getAuctionTextById = async (id: string) => {
  const r = await db.query(
    `SELECT id, title, description FROM auctions WHERE id = $1`,
    [id]
  );
  return r.rows[0] as
    | { id: string; title: string; description: string }
    | undefined;
};

// Written by Node only. Python is read-only at the database level.
export const setAuctionEmbedding = async (input: {
  id: string;
  embedding: number[];
  provider: string;
  model: string;
}) => {
  await db.query(
    `UPDATE auctions
     SET embedding = $1::vector, embedding_provider = $2, embedding_model = $3, embedded_at = NOW()
     WHERE id = $4`,
    [toPgVector(input.embedding), input.provider, input.model, input.id]
  );
};

export const setAuctionCategory = async (id: string, category: string) => {
  await db.query(`UPDATE auctions SET category = $2 WHERE id = $1`, [
    id,
    category,
  ]);
};

/** Rows still needing an embedding for the given model (resumable + idempotent backfill). */
export const getAuctionsNeedingEmbedding = async (input: {
  model: string;
  limit: number;
}) => {
  const r = await db.query(
    `SELECT id, title, description FROM auctions
     WHERE embedding IS NULL OR embedding_model IS DISTINCT FROM $1
     ORDER BY id LIMIT $2`,
    [input.model, input.limit]
  );
  return r.rows as { id: string; title: string; description: string }[];
};

export const getEmbeddingStats = async () => {
  const r = await db.query(
    `SELECT count(*)::int AS total,
            count(embedding)::int AS embedded,
            count(DISTINCT vector_dims(embedding))::int AS distinct_dims,
            min(vector_dims(embedding)) AS dims,
            array_agg(DISTINCT embedding_model) FILTER (WHERE embedding_model IS NOT NULL) AS models
     FROM auctions`
  );
  return r.rows[0];
};

/** Hydrate full records for IDs, preserving the caller's ranking order. */
export const getAuctionsByIds = async (ids: string[]) => {
  if (ids.length === 0) return [];
  const r = await db.query(
    `SELECT ${AUCTION_COLUMNS} FROM auctions WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  const byId = new Map(r.rows.map((row) => [row.id as string, row]));
  return ids.map((id) => byId.get(id)).filter((row) => row !== undefined);
};
