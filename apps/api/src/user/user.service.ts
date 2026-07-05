import { db, findById, getMyAuctionRepository } from "@repo/db";
import { GetAuctionsInput } from "@repo/types";

export interface myAuctionsServiceInput {
  id: string;
  limit: number;
  cursor: GetAuctionsInput["cursor"];
}

export async function getMe(userId: string) {
  const user = await findById(userId);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    role: user.role,
  };
}

export const getMyAuctionService = async (data: myAuctionsServiceInput) => {
  const { id, limit, cursor } = data;

  const rows = await getMyAuctionRepository({ id, limit: limit + 1, cursor });

  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];

  const nextCursor =
    hasNextPage && lastItem
      ? {
          startTime: lastItem.start_time,
          id: lastItem.id,
        }
      : null;

  return {
    items,
    pagination: {
      limit,
      hasNextPage,
      nextCursor,
    },
  };
};

export const getAllNotificationsRepository = async (userId: string) => {
  const client = await db.connect();

  try {
    const query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [userId]);

    return result.rows;
  } finally {
    client.release();
  }
};
