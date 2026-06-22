import { Worker } from "bullmq";

export const auctionWorker = new Worker(
  "auction",
  async (job) => {
    console.log("Job Name:", job.name);
    console.log("Job Data:", job.data);

    switch (job.name) {
      case "auction-expiry":
        console.log(`Processing auction expiry for ${job.data.auctionId}`);
        break;

      default:
        console.warn(`Unknown job: ${job.name}`);
    }
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  }
);

auctionWorker.on("completed", (job) => {
  console.log(`Job completed: ${job?.id}`);
});

auctionWorker.on("failed", (job, err) => {
  console.error(`Job failed: ${job?.id}`, err);
});
