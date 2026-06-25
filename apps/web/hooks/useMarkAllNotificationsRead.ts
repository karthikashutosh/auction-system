import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/axios";
import { NotificationResponse } from "@repo/types";

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["notifications"],
      });

      const previousNotifications = queryClient.getQueryData<
        NotificationResponse[]
      >(["notifications"]);

      queryClient.setQueryData<NotificationResponse[]>(
        ["notifications"],
        (old = []) =>
          old.map((notification) => ({
            ...notification,
            is_read: true,
          }))
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

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
  });
};
