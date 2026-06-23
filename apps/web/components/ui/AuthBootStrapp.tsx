import { useGetAllNotifications } from "../../hooks/useGetAllNotifications";
import { useMe } from "../../hooks/useMe";
import { useNotificationEvents } from "../../hooks/useNotificationEvents";

export function AuthBootstrap() {
  useMe();
  useGetAllNotifications();
  useNotificationEvents();

  return null;
}
