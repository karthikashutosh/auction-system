import { FastifyPluginAsync } from "fastify";
import {
  createAuctionController,
  getAllAuctionsController,
  getAuctionByIdController,
  placeBidController,
} from "./auctions.controller";

export const auctionsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", createAuctionController);
  app.get("/", getAllAuctionsController);
  app.get("/:id", getAuctionByIdController);
  app.post("/:id/bids", placeBidController);
};
