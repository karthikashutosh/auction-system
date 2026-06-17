import { FastifyReply, FastifyRequest } from "fastify";
import { getAuctionsSchema } from "../../../../packages/shared/src/createAuctions.schema";
import { getMe, getMyAuctionService } from "./user.service";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function getMeController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;

  const result = await getMe(user.id);

  reply.code(200).send(result);
}

export async function logoutController(_, reply: FastifyReply) {
  reply.clearCookie("accessToken", {
    path: "/",
  });
}

export const getMyAuctionsController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as AuthUser;
  const query = getAuctionsSchema.parse(request.query);
  const { limit, page } = query;

  const response = await getMyAuctionService({ id: user.id, limit, page });

  reply.code(200).send(response);
};
