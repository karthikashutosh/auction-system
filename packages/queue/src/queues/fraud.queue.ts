import { Queue } from "bullmq";
import { bullRedis } from "@repo/redis";

export const fraudQueue = new Queue("fraud", {
  connection: bullRedis,
});

/** Scoring must never block or fail a bid: callers fire-and-forget. */
export const enqueueBidScoring = (bidId: string) =>
  fraudQueue.add(
    "score-bid",
    { bidId },
    {
      jobId: `score-bid-${bidId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 5000,
    }
  );

/**
 * One paid LLM investigation per (bidder, auction): a burst of 30 flagged bids from the
 * same account on the same auction must not cost 30 investigations. BullMQ ignores an
 * add() whose jobId already exists (including completed jobs still retained), so the
 * dedupe key is the jobId.
 */
export const enqueueInvestigation = (flagId: string, dedupeKey: string = flagId) =>
  fraudQueue.add(
    "investigate",
    { flagId },
    {
      jobId: `investigate-${dedupeKey}`,
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1000,
    }
  );
