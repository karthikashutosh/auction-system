"use client";

import { Flex, Box } from "@chakra-ui/react";
import { LoadingScreen } from "../../components/ui/loadingPage";
import { useMe } from "../../hooks/useMe";
import { AppSidebar } from "../components/layout/app-sidebar";
import { useRouter } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useMe();
  const router = useRouter();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError || !user) {
    router.replace("/login");
    return null;
  }

  return (
    <Flex minH="100vh">
      <AppSidebar />
      <Box flex="1">{children}</Box>
    </Flex>
  );
}
