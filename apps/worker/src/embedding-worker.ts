import { aiClient } from "@repo/ai-client";
import { getAuctionTextById, setAuctionEmbedding } from "@repo/db";
import { bullRedis } from "@repo/redis";
import { Worker } from "bullmq";

import { embeddingText } from "./embedding-text";

/**
 * Python computes the vector (pure compute, no DB access); this worker,
 * which has the write-permitted role, persists it.
 * If the AI service is down the job throws and BullMQ retries with backoff,
 * so no job is lost.
 */
export const generateEmbeddingJob = async (auctionId: string) => {
  const auction = await getAuctionTextById(auctionId);
  if (!auction) return; // deleted since enqueue
  const res = await aiClient.embed(embeddingText(auction), "embed_auction");
  await setAuctionEmbedding({
    id: auctionId,
    embedding: res.embedding,
    provider: res.provider,
    model: res.model,
  });
};

export const embeddingWorker = new Worker(
  "embedding",
  async (job) => {
    if (job.name === "generate-embedding") {
      await generateEmbeddingJob(job.data.auctionId);
    } else {
      console.warn(`Unknown embedding job: ${job.name}`);
    }
  },
  { connection: bullRedis, concurrency: 4 }
);

embeddingWorker.on("completed", (job) => console.log(`Embedding job completed: ${job.id}`));
embeddingWorker.on("failed", (job, err) =>
  console.error(`Embedding job failed: ${job?.id} (attempt ${job?.attemptsMade})`, err.message)
);
