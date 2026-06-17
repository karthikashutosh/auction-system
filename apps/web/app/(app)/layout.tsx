import { Box, Flex } from "@chakra-ui/react";
import { AppSidebar } from "../components/layout/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Flex minH="100vh">
      <AppSidebar />
      <Box flex="1">{children}</Box>
    </Flex>
  );
}
