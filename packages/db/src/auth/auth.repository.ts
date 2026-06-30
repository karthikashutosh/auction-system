import { db } from "../db";

export type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string | null;
  provider: "local" | "google";
  providerId: string | null;
  avatarUrl: string | null;
};

export const findExistingUser = async (email: string) => {
  const results = await db.query(
    `SELECT * FROM users WHERE email =$1 LIMIT 1`,
    [email],
  );
  return results.rows[0];
};

export const createUser = async (data: CreateUserInput) => {
  const { email, name, passwordHash, provider, providerId, avatarUrl } = data;
  const results = await db.query(
    `INSERT INTO users
    (
      name,
      email,
      password_hash,
      provider,
      provider_id,
      avatar_url
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *`,
    [name, email, passwordHash, provider, providerId, avatarUrl],
  );
  return results.rows[0];
};
