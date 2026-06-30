import { getActiveAuctionsRepository } from "@repo/db";
import { auctionQueue } from "@repo/queue";

export const auctionRecovery = async () => {
  const activeAuctions = await getActiveAuctionsRepository();

  for (const auction of activeAuctions) {
    const delay = new Date(auction.end_time).getTime() - Date.now();

    await auctionQueue.add(
      "auction-expiry",
      {
        auctionId: auction.id,
      },
      {
        jobId: `auction-expiry-${auction.id}`,
        ...(delay >= 0 ? { delay } : {}),
      },
    );
  }
};
