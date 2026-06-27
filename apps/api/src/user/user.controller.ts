import { FastifyReply, FastifyRequest } from "fastify";
import {
  getAllNotificationsRepository,
  getMe,
  getMyAuctionService,
} from "./user.service";
import { AuthUser } from "@repo/types";
import { getAuctionsSchema } from "@repo/shared";

export async function getMeController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;

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

export const getAllNotificationsController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as AuthUser;
  const result = await getAllNotificationsRepository(user.id);

  reply.code(200).send(result);
};
