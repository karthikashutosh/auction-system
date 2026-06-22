import { Queue } from "bullmq";

export const auctionQueue = new Queue("auction", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});
