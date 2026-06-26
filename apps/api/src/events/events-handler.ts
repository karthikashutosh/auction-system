import { sendNotification } from "../realtime/notification-sse-manager";
import { sendRealTimeBidsUpdate } from "../realtime/sse-manager.ts";

export const bidsEventsHandler = (message: string) => {
  const updatedBids = JSON.parse(message);
  sendRealTimeBidsUpdate({
    auctionId: updatedBids.auctionId,
    payload: updatedBids.payload,
  });
};

export const notificationHandler = (message: string) => {
  const notifications = JSON.parse(message);

  sendNotification({
    payload: notifications.payload,
    userId: notifications.userId,
  });
};
