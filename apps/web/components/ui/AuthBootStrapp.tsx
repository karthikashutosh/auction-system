"use client";

import { ReactNode, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/auth.store";
import { getUserProfile } from "../../api/auth.api";
import { LoadingScreen } from "./loadingPage";

type Props = {
  children: ReactNode;
};

export function AuthBootstrap({ children }: Props) {
  const initialize = useAuthStore((s) => s.initialize);

  const isInitialized = useAuthStore((s) => s.isInitialized);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: getUserProfile,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (query.isSuccess) {
      initialize(query.data);
    }

    if (query.isError) {
      initialize(null);
    }
  }, [query.isSuccess, query.isError, query.data, initialize]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
