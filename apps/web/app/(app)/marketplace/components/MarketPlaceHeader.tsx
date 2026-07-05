"use client";

import NextLink from "next/link";

import {
  Avatar,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Menu,
  Portal,
  Text,
} from "@chakra-ui/react";
import { ringCss } from "../../../theme";
import { User } from "@repo/types";
import { Notification } from "../../../components/Notifications/Notifications";

type MarketplaceHeaderProps = {
  user: User | null;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
};

export function MarketplaceHeader({
  user,
  isLoggingOut,
  onLogout,
}: MarketplaceHeaderProps) {
  return (
    <Flex justify="space-between" align="center" py={6} gap={4} flexWrap="wrap">
      <Box>
        <Heading
          size="xl"
          color="text"
          letterSpacing="-0.03em"
          fontWeight="800"
        >
          AuctionFlow
        </Heading>
      </Box>
      <HStack gap={3}>
        <Button
          asChild
          colorPalette="brand"
          size="md"
          data-testid="create-auction-nav-button"
        >
          <NextLink href="/create">Create Auction</NextLink>
        </Button>
        <Notification />
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <Button
              variant="ghost"
              p={0}
              minW="auto"
              h="auto"
              borderRadius="full"
              data-testid="profile-menu-button"
            >
              <Avatar.Root css={ringCss} colorPalette="green">
                <Avatar.Image src={user?.avatar_url} />
                <Avatar.Fallback name={user?.name ?? "Guest"} />
              </Avatar.Root>
            </Button>
          </Menu.Trigger>

          <Portal>
            <Menu.Positioner>
              <Menu.Content p={2}>
                <Button
                  width="full"
                  size="sm"
                  colorPalette="red"
                  loading={isLoggingOut}
                  onClick={onLogout}
                  data-testid="logout-button"
                >
                  Logout
                </Button>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>
    </Flex>
  );
}
