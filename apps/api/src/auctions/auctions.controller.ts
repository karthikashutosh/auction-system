import { FastifyReply, FastifyRequest } from "fastify";
import {
  createAuctionService,
  getAllAuctionsService,
  getAuctionByIdService,
} from "./auctions.service";
import { createAuctionApiSchema, getAuctionsSchema } from "@repo/shared";
import { AuthUser } from "../user/user.controller";

interface GetAuctionByIdParams {
  id: string;
}

export const createAuctionController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as AuthUser;
  const payload = createAuctionApiSchema.parse(request.body);
  const result = await createAuctionService(user.id, payload);
  reply.code(201).send(result);
};

export const getAllAuctionsController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const query = getAuctionsSchema.parse(request.query);

  const result = await getAllAuctionsService(query);

  return reply.code(200).send(result);
};

export const getAuctionByIdController = async (
  request: FastifyRequest<{ Params: GetAuctionByIdParams }>,
  reply: FastifyReply
) => {
  const response = await getAuctionByIdService(request.params.id);
  return reply.send(response);
};
