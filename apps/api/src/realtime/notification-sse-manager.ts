import { NotificationResponse } from "@repo/types";
import { ServerResponse } from "http";

const notificationMap = new Map<string, Set<ServerResponse>>();

type SubscribeNotificationData = {
  userId: string;
  connection: ServerResponse;
};

type SendNotificationData = {
  userId: string;
  payload: NotificationResponse;
};

export function subscribeNotification(data: SubscribeNotificationData) {
  const { userId, connection } = data;

  if (!notificationMap.has(userId)) {
    notificationMap.set(userId, new Set());
  }

  notificationMap.get(userId)?.add(connection);
}

export function unSubscribeNotification(data: SubscribeNotificationData) {
  const { userId, connection } = data;

  const connections = notificationMap.get(userId);

  if (!connections) return;

  connections.delete(connection);

  if (connections.size === 0) {
    notificationMap.delete(userId);
  }
}

export function sendNotification(data: SendNotificationData) {
  const { userId, payload } = data;

  const connections = notificationMap.get(userId);

  if (!connections) return;

  const message = `data: ${JSON.stringify(payload)}\n\n`;

  for (const connection of connections) {
    connection.write(message);
  }
}
