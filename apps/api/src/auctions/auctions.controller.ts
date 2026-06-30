import { FastifyReply, FastifyRequest } from "fastify";
import {
  createAuctionService,
  getAllAuctionsService,
  getAuctionByIdService,
  getBidsHistoryService,
  placeBidService,
} from "./auctions.service";
import { createAuctionApiSchema, getAuctionsSchema } from "@repo/shared";
import { AuthUser } from "@repo/types";
import {
  subscribeNotification,
  unSubscribeNotification,
} from "../realtime/notification-sse-manager";
import { findById } from "@repo/db";
import { Subscribe, unSubscribe } from "../realtime/sse-manager";

interface GetAuctionByIdParams {
  id: string;
}

export const createAuctionController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const user = request.user as AuthUser;
  const payload = createAuctionApiSchema.parse(request.body);
  const result = await createAuctionService(user.id, payload);
  reply.code(201).send(result);
};

export const getAllAuctionsController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const query = getAuctionsSchema.parse(request.query);

  const result = await getAllAuctionsService(query);

  return reply.code(200).send(result);
};

export const getAuctionByIdController = async (
  request: FastifyRequest<{ Params: GetAuctionByIdParams }>,
  reply: FastifyReply,
) => {
  const user = request.user as AuthUser;
  const response = await getAuctionByIdService({
    auctionId: request.params.id,
    userId: user.id,
  });
  return reply.send(response);
};

export const placeBidController = async (
  request: FastifyRequest<{ Body: { bidAmount: number } }>,
  reply: FastifyReply,
) => {
  const user = request.user as AuthUser;
  const userInfo = await findById(user.id);
  const { id: auctionId } = request.params as { id: string };

  const bidResult = await placeBidService({
    auctionId,
    userId: user.id,
    bidAmount: request.body.bidAmount,
    userName: userInfo.name,
  });

  reply.code(201).send(bidResult);
};

export const getBidsHistoryController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const user = request.user as AuthUser;

  const { limit, page } = request.query as { page: number; limit: number };
  const result = await getBidsHistoryService({
    userId: user.id,
    limit,
    page,
  });

  reply.code(200).send(result);
};

export const getBidRealTimeController = (
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
) => {
  const { id: userId } = request.user as AuthUser;
  const auctionId = request.params.id;

  reply.raw.setHeader("Content-Type", "text/event-stream");

  reply.raw.setHeader("Cache-Control", "no-cache");

  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_URL!);

  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");

  reply.raw.flushHeaders();

  Subscribe({
    auctionId,
    userId,
    connection: reply.raw,
  });

  request.raw.on("close", () => {
    unSubscribe({
      auctionId,
      connection: reply.raw,
    });
  });
};

export const getNotificationEvents = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { id: userId } = request.user as AuthUser;

  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_URL!);
  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
  reply.raw.flushHeaders();

  subscribeNotification({ connection: reply.raw, userId });

  reply.raw.on("close", () => {
    unSubscribeNotification({ connection: reply.raw, userId });
  });
};
