import Fastify from "fastify";
import type { Auction } from "@repo/types";

const auction: Auction = {
  id: "1",
  title: "iPhone 17",
  currentPrice: 1000,
};

const app = Fastify();

app.get("/", async () => {
  return { message: "Auction API Running" };
});

app.listen({
  port: 3001,
});