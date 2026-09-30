import "dotenv/config";
import { auctionRecovery } from "./auction-recovery";
export * from "./auction-worker";
export * from "./embedding-worker";
export * from "./fraud-worker";

const startUp = async () => {
  try {
    await auctionRecovery();
  } catch (error) {
    console.error("Failed to start worker", error);
    process.exit(1);
  }
};

startUp();
