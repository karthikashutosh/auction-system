import "dotenv/config";
import Fastify from "fastify";
import { authRoutes } from "./auth/auth.routes";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { authenticate } from "./auth/authenticate";
import { userRoutes } from "./user/user.routes";
import multipart from "@fastify/multipart";
import { uploadRoutes } from "./uploads/uploads.routes";
import { auctionsRoutes } from "./auctions/auctions.routes";
import { AppError } from "./errors";
import { db } from "@repo/db";

const app = Fastify();

app.register(fastifyCookie);

app.register(cors, {
  origin: process.env.CLIENT_URL,
  credentials: true,
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

app.listen({ port: 3001 }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log("Server running on port 3001");
});
