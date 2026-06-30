import "dotenv/config";
import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { db } from "@repo/db";
import Fastify from "fastify";
import { auctionsRoutes } from "./auctions/auctions.routes";
import { authRoutes } from "./auth/auth.routes";
import { authenticate } from "./auth/authenticate";
import { uploadRoutes } from "./uploads/uploads.routes";
import { userRoutes } from "./user/user.routes";
import { subscribe } from "@repo/redis";
import {
  bidsEventsHandler,
  notificationHandler,
} from "./events/events-handler";
import { notificationsRoutes } from "./notifications/notifications.routes";
import { AppError } from "@repo/types";
import fastifyRateLimit from "@fastify/rate-limit";

const app = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
    },
  },
});

app.register(fastifyCookie);

app.register(cors, {
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET!,
  cookie: {
    cookieName: "accessToken",
    signed: false,
  },
});

app.register(multipart);

app.decorate("authenticate", authenticate);

app.register(fastifyRateLimit, {
  global: true,
  max: 100,
  timeWindow: "1 minute",
});

app.register(authRoutes, {
  prefix: "api/auth",
});

app.register(async (app) => {
  app.addHook("preHandler", authenticate);

  app.register(userRoutes, {
    prefix: "api/user",
  });
});

app.register(async (app) => {
  app.addHook("preHandler", authenticate);
  app.register(uploadRoutes, {
    prefix: "api/uploads",
  });
});

app.register(async (app) => {
  app.addHook("preHandler", authenticate);
  app.register(auctionsRoutes, {
    prefix: "api/auctions",
  });
});

app.register(async (app) => {
  app.addHook("preHandler", authenticate);
  app.register(notificationsRoutes, {
    prefix: "api/notifications",
  });
});

app.get("/health", async (_, reply) => {
  try {
    await db.query("SELECT 1");

    return {
      status: "healthy",
    };
  } catch {
    reply.code(503);

    return {
      status: "unhealthy",
    };
  }
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      code: error.code,
      message: error.message,
    });
  }

  return reply.status(500).send({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  });
});

const start = async () => {
  await subscribe("auction-events", bidsEventsHandler);
  await subscribe("notifications-events", notificationHandler);

  await app.listen({
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 3001),
  });

  console.log("Server running on port 3001");
};

start();
