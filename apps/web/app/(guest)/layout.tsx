"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMe } from "../../hooks/useMe";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/marketplace");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return null;
  }

  if (user) {
    return null;
  }

  return children;
}
