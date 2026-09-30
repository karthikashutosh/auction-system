import { Queue } from "bullmq";
import { bullRedis } from "@repo/redis";

export const embeddingQueue = new Queue("embedding", {
  connection: bullRedis,
});

export const enqueueEmbedding = (auctionId: string) =>
  embeddingQueue.add(
    "generate-embedding",
    { auctionId },
    {
      jobId: `generate-embedding-${auctionId}`,
      attempts: 8,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 1000,
      removeOnFail: false,
    }
  );
