"use client";

import { Box, Flex } from "@chakra-ui/react";
import { AppSidebar } from "../components/layout/app-sidebar";
import { AuthBootstrap } from "../../components/ui/AuthBootStrapp";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex minH="100vh">
      <AuthBootstrap />
      <AppSidebar />
      <Box flex="1">{children}</Box>
    </Flex>
  );
}
