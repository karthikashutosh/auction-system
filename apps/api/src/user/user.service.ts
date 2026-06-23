import {
  db,
  findById,
  getMyAuctionCount,
  getMyAuctionRepository,
} from "@repo/db";

export interface myAuctionsServiceInput {
  id: string;
  page: number;
  limit: number;
}

export async function getMe(userId: string) {
  const user = await findById(userId);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
  };
}

export const getMyAuctionService = async (data: myAuctionsServiceInput) => {
  const { id, limit, page } = data;

  const offset = (page - 1) * limit;

  const [count, items] = await Promise.all([
    getMyAuctionCount(id),
    getMyAuctionRepository({ id, limit, offset }),
  ]);
  const totalPages = Math.ceil(count / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
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
