import { FastifyReply, FastifyRequest } from "fastify";
import { getAuctionsSchema } from "../../../../packages/shared/src/createAuctions.schema";
import { getMe, getMyAuctionService } from "./user.service";
import { db } from "../db";

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

  const results = await db.query("SELECT NOW()");
  console.log(results.rows);

  const result = await getMe(user.id);

  reply.code(200).send(result);
}

export const logoutController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  reply.clearCookie("accessToken", {
    path: "/",
  });

  reply.clearCookie("refreshToken", {
    path: "/",
  });

  return reply.send({
    success: true,
  });
};

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
