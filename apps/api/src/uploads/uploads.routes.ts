import { FastifyPluginAsync } from "fastify";
import { uploadsController } from "./uploads.controller";

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post("/presigned-url", uploadsController);
};
