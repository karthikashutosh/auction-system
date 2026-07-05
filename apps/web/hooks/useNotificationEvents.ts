import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { notify } from "../app/lib/notify";
import { refershSession } from "../api/axios";

export const useNotificationEvents = (isAuthenticated: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    let eventSource: EventSource | null = null;
    let isRefreshing = false;

    const connect = () => {
      eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/user/notifications-event`,
        {
          withCredentials: true,
        }
      );

      eventSource.onmessage = (event) => {
        const notification = JSON.parse(event.data);

        queryClient.setQueryData(
          ["notifications"],
          (old: Notification[] = []) => [notification, ...old]
        );

        switch (notification.type) {
          case "AUCTION_WON":
            notify.success({
              title: notification.title,
              description: notification.message,
            });
            break;

          case "AUCTION_ENDED":
            notify.info({
              title: notification.title,
              description: notification.message,
            });
            break;
        }
      };

      eventSource.onerror = async (error) => {
        console.error("[SSE] Error", error);

        // Prevent multiple simultaneous refresh attempts
        if (isRefreshing) return;

        isRefreshing = true;
        eventSource?.close();

        try {
          await refershSession();

          connect();
        } catch (e) {
          console.error("Refresh failed", e);
        } finally {
          isRefreshing = false;
        }
      };
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [isAuthenticated, queryClient]);
};
