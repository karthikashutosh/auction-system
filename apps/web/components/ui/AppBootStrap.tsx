"use client";

import { ReactNode } from "react";
import { useAuthStore } from "../../store/auth.store";
import { useGetAllNotifications } from "../../hooks/useGetAllNotifications";
import { useNotificationEvents } from "../../hooks/useNotificationEvents";

type Props = {
  children: ReactNode;
};

export function AppBootstrap({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useGetAllNotifications(isAuthenticated);

  useNotificationEvents(isAuthenticated);

  return <>{children}</>;
}
