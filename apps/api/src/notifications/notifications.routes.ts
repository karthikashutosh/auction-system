import { FastifyPluginAsync } from "fastify";
import {
  allNotificationsReadController,
  notificationReadController,
} from "./notifications.controller";

export const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.patch("/read", notificationReadController);
  app.patch("/read-all", allNotificationsReadController);
};
