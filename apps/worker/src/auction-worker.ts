import {
  createNotificationRepository,
  db,
  getValidAuctionById,
  updateAuctionStatusRepository,
} from "@repo/db";
import { bullRedis, publish } from "@repo/redis";
import { NotFoundError, NotificationResponse } from "@repo/types";
import { Worker } from "bullmq";

export const auctionWorker = new Worker(
  "auction",
  async (job) => {
    switch (job.name) {
      case "auction-expiry":
        await auctionExpiryJob(job.data.auctionId);
        break;

      default:
        console.warn(`Unknown job: ${job.name}`);
    }
  },
  {
    connection: bullRedis,
  },
);

auctionWorker.on("completed", (job) => {
  console.log(`Job completed: ${job?.id}`);
});

auctionWorker.on("failed", (job, err) => {
  console.error(`Job failed: ${job?.id}`, err);
});

export const auctionExpiryJob = async (id: string) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const validAuction = await getValidAuctionById({
      client,
      auctionInput: { auctionId: id },
    });

    if (!validAuction) {
      throw new NotFoundError("Auction not found", "AUCTION_NOT_FOUND");
    }

    if (validAuction.status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return;
    }

    if (new Date() < validAuction.endTime) {
      await client.query("ROLLBACK");
      return;
    }

    await updateAuctionStatusRepository({
      auctionId: id,
      client,
      status: "ENDED",
      highest_bidder_id: validAuction.highest_bidder_id,
    });

    let winnerNotification: NotificationResponse | null = null;

    if (validAuction.highest_bidder_id) {
      winnerNotification = await createNotificationRepository({
        client,
        userId: validAuction.highest_bidder_id,
        title: "Auction Won",
        message: `You won ${validAuction.title}`,
        type: "AUCTION_WON",
        entityType: "AUCTION",
        entityId: validAuction.id,
      });
    }

    const sellerNotification = await createNotificationRepository({
      client,
      userId: validAuction.owner_id,
      title: "Auction Ended",
      message: `Your auction ${validAuction.title} has ended`,
      type: "AUCTION_ENDED",
      entityType: "AUCTION",
      entityId: validAuction.id,
    });

    await client.query("COMMIT");

    if (winnerNotification) {
      await publish("notifications-events", {
        userId: winnerNotification.user_id,
        payload: winnerNotification,
      });
    }

    await publish("notifications-events", {
      userId: sellerNotification?.user_id,
      payload: sellerNotification,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
