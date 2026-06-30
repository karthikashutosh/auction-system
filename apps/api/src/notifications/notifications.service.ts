import {
  notificationAllReadRespository,
  notificationReadRespository,
} from "@repo/db";
import { NotificationControlType } from "@repo/types";

export const notificationsReadService = async (
  data: NotificationControlType,
) => {
  const { notificationId, userId } = data;
  const response = await notificationReadRespository({
    userId,
    notificationId,
  });
  return response;
};

export const notificationsAllReadService = async (userId: string) => {
  const response = await notificationAllReadRespository(userId);
  return response;
};
