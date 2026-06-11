import Fastify from "fastify";
import { db } from "./db";

const app = Fastify();

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