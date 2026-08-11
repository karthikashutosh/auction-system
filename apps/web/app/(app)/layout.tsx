"use client";

import { Box, Flex } from "@chakra-ui/react";
import { AppSidebar } from "../components/layout/app-sidebar";
import { AuthBootstrap } from "../../components/ui/AuthBootStrapp";
import { AppBootstrap } from "../../components/ui/AppBootStrap";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthBootstrap>
      <AppBootstrap>
        <Flex h="100vh" overflow="hidden">
          <AppSidebar />
          <Box flex="1" overflowY="auto" minW={0}>
            {children}
          </Box>
        </Flex>
      </AppBootstrap>
    </AuthBootstrap>
  );
}
