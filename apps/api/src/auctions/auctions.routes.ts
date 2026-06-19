import { FastifyPluginAsync } from "fastify";
import {
  createAuctionController,
  getAllAuctionsController,
  getAuctionByIdController,
  getBidRealTimeController,
  getBidsHistoryController,
  placeBidController,
} from "./auctions.controller";

export const auctionsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", createAuctionController);
  app.get("/", getAllAuctionsController);
  app.get("/:id", getAuctionByIdController);
  app.post("/:id/bids", placeBidController);
  app.get("/bids/me", getBidsHistoryController);
  app.get("/:id/events", getBidRealTimeController);
};
