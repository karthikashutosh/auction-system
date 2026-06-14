import "dotenv/config";
import Fastify from "fastify";
import { db } from "./db";
import { authRoutes } from "./auth/auth.routes";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie"

const app = Fastify();

app.register(fastifyCookie);

app.register(cors, {
  origin: "http://localhost:3000",
  credentials: true,
});

 app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET!,
});

app.register(authRoutes, {
  prefix: "api/auth",
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

app.listen({ port: 3001 }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log("Server running on port 3001");
});
