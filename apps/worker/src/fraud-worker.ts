import { aiClient } from "@repo/ai-client";
import { getFlagById, insertFlag, saveVerdict } from "@repo/db";
import { enqueueInvestigation } from "@repo/queue";
import { bullRedis } from "@repo/redis";
import { Worker } from "bullmq";

const AUTO_INVESTIGATE = process.env.FRAUD_AUTO_INVESTIGATE !== "false";

/** Python scores (read-only); Node persists the flag. A failure here never touches the bid. */
export const scoreBidJob = async (bidId: string) => {
  const s = await aiClient.scoreBid(bidId);
  if (!s.flagged) return;
  const flag = await insertFlag({
    auctionId: s.auction_id,
    bidId: s.bid_id,
    userId: s.user_id,
    score: s.score,
    features: s.features,
    contributions: s.contributions,
  });
  if (flag && AUTO_INVESTIGATE) {
    await enqueueInvestigation(flag.id, `${s.user_id}-${s.auction_id}`);
  }
};

export const investigateJob = async (flagId: string) => {
  const flag = await getFlagById(flagId);
  if (!flag || flag.verdict) return;
  const verdict = await aiClient.investigate({
    bid_id: flag.bid_id,
    score: Number(flag.score),
    features: flag.features,
  });
  await saveVerdict(flagId, verdict);
};

export const fraudWorker = new Worker(
  "fraud",
  async (job) => {
    switch (job.name) {
      case "score-bid":
        return scoreBidJob(job.data.bidId);
      case "investigate":
        return investigateJob(job.data.flagId);
      default:
        console.warn(`Unknown fraud job: ${job.name}`);
    }
  },
  { connection: bullRedis, concurrency: 2 }
);

fraudWorker.on("failed", (job, err) =>
  console.error(`Fraud job failed: ${job?.id}`, err.message)
);
