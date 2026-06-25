import { useMutation, useQueryClient } from "@tanstack/react-query";

import { NotificationResponse } from "@repo/types";
import { api } from "../api/axios";

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation<
    NotificationResponse,
    Error,
    string,
    {
      previousNotifications?: NotificationResponse[];
    }
  >({
    mutationFn: async (notificationId: string) => {
      const response = await api.patch<NotificationResponse>(
        `/notifications/read`,
        {
          notificationId,
        }
      );

      return response.data;
    },

    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({
        queryKey: ["notifications"],
      });

      const previousNotifications = queryClient.getQueryData<
        NotificationResponse[]
      >(["notifications"]);

      queryClient.setQueryData<NotificationResponse[]>(
        ["notifications"],
        (old = []) =>
          old.map((notification) =>
            notification.id === notificationId
              ? {
                  ...notification,
                  is_read: true,
                }
              : notification
          )
      );

      return {
        previousNotifications,
      };
    },

    onError: (_, __, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications
        );
      }
    },

    onSuccess: (updatedNotification) => {
      queryClient.setQueryData<NotificationResponse[]>(
        ["notifications"],
        (old = []) =>
          old.map((notification) =>
            notification.id === updatedNotification.id
              ? updatedNotification
              : notification
          )
      );
    },
  });
};
