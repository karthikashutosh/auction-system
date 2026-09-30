import { searchQuerySchema, valuationSchema } from "@repo/shared";
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  searchAuctionsService,
  similarAuctionsService,
  valuationService,
} from "./search.service";

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/search",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request) => {
      const query = searchQuerySchema.parse(request.query);
      return searchAuctionsService(query);
    }
  );

  app.get("/:id/similar", async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    return similarAuctionsService(id, 6);
  });

  app.post(
    "/valuation",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request) => valuationService(valuationSchema.parse(request.body))
  );
};
