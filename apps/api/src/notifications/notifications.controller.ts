import { FastifyReply, FastifyRequest } from "fastify";
import {
  notificationsAllReadService,
  notificationsReadService,
} from "./notifications.service";
import { AuthUser } from "@repo/types";

export const notificationReadController = async (
  request: FastifyRequest<{
    Body: {
      notificationId: string;
    };
  }>,
  reply: FastifyReply,
) => {
  const notificationId = request.body.notificationId;
  const user = request.user as AuthUser;

  const result = await notificationsReadService({
    userId: user.id,
    notificationId,
  });

  reply.code(200).send(result);
};

export const allNotificationsReadController = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const user = request.user as AuthUser;
  const result = await notificationsAllReadService(user.id);
  reply.code(200).send(result);
};
