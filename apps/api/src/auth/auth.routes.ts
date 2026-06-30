import { FastifyPluginAsync } from "fastify";
import {
  googleOauthController,
  loginController,
  refreshTokenController,
  signupController,
} from "./auth.controller";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/signup",
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "5 minutes",
        },
      },
    },
    signupController,
  );
  app.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    loginController,
  );
  app.post("/google", googleOauthController);
  app.post("/refresh", refreshTokenController);
};
