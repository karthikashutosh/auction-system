import { FastifyPluginAsync } from "fastify";
import { loginController, signupController } from "./auth.controller";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/signup", signupController);
  app.post("/login", loginController);
};
