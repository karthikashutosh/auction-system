import {
  findById,
  getMyAuctionCount,
  getMyAuctionRepository,
} from "./user.repository";

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
