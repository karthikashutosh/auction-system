import { useQuery } from "@tanstack/react-query";
import { api } from "../api/axios";
import { NotificationResponse } from "@repo/types";

export const useGetAllNotifications = (isAuthenticated: boolean) => {
  return useQuery<NotificationResponse[], Error>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get("user/notifications");

      return response.data;
    },
    enabled: isAuthenticated,
  });
};
