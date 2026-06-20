import { FastifyPluginAsync } from "fastify";
import {
  googleOauthController,
  loginController,
  refreshTokenController,
  signupController,
} from "./auth.controller";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/signup", signupController);
  app.post("/login", loginController);
  app.post("/google", googleOauthController);
  app.post("/refresh", refreshTokenController);
};
