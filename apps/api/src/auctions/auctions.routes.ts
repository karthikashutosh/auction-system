import { FastifyPluginAsync } from "fastify";
import {
  createAuctionController,
  getAllAuctionsController,
  getAuctionByIdController,
} from "./auctions.controller";

export const auctionsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", createAuctionController);
  app.get("/", getAllAuctionsController);
  app.get("/:id", getAuctionByIdController);
};
