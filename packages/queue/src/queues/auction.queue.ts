import { Queue } from "bullmq";
import { bullRedis } from "@repo/redis";

export const auctionQueue = new Queue("auction", {
  connection: bullRedis,
});
