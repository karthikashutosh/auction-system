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
  app.post(
    "/",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    createAuctionController,
  );
  app.get("/", getAllAuctionsController);
  app.get("/:id", getAuctionByIdController);
  app.post(
    "/:id/bids",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    placeBidController,
  );
  app.get("/bids/me", getBidsHistoryController);
  app.get("/:id/events", getBidRealTimeController);
};
