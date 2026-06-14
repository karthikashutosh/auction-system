import { FastifyPluginAsync } from "fastify";
import { getMeController, logoutController } from "./user.controller";

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", getMeController);
  app.post("/logout", logoutController);
};
