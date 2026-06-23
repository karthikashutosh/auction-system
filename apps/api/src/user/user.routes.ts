import { FastifyPluginAsync } from "fastify";
import {
  getAllNotificationsController,
  getMeController,
  getMyAuctionsController,
  logoutController,
} from "./user.controller";
import { getNotificationEvents } from "../auctions/auctions.controller";

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", getMeController);
  app.post("/logout", logoutController);
  app.get("/me/auctions", getMyAuctionsController);
  app.get("/notifications", getAllNotificationsController);
  app.get("/notifications-event", getNotificationEvents);
};
