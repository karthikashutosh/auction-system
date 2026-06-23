import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { notify } from "../app/lib/notify";
import { refershSession } from "../api/axios";

export const useNotificationEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/notifications-event`,
      {
        withCredentials: true,
      }
    );

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);

      queryClient.setQueryData(["notifications"], (old: Notification[]) => [
        notification,
        ...old,
      ]);

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
      console.log("[SSE] Error", error);

      try {
        await refershSession();
        eventSource.close();
        useNotificationEvents();
      } catch (e) {
        console.log("Refresh failed", e);

        //   window.location.href = "/login";
      }
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
};
