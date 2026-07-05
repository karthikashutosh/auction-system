"use client";

import NextLink from "next/link";

import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";

import { AuctionsResponse } from "@repo/types";

type AuctionCardProps = {
  auction: AuctionsResponse["items"][number];
};

export function AuctionCard({ auction }: AuctionCardProps) {
  return (
    <Card.Root
      h="100%"
      borderRadius="2xl"
      overflow="hidden"
      borderWidth="1px"
      borderColor="border"
      bg="bg.panel"
      transition="all .25s ease"
      _hover={{
        transform: "translateY(-6px)",
        shadow: "xl",
        borderColor: "primary",
      }}
    >
      <Card.Body display="flex" flexDirection="column" p={6}>
        <Flex justify="space-between" align="flex-start" mb={4}>
          <Heading size="md" color="text" lineClamp={2} flex="1" pr={3}>
            {auction.title}
          </Heading>

          <Badge
            colorPalette={auction.status === "ACTIVE" ? "green" : "red"}
            borderRadius="full"
            px={3}
            py={1}
          >
            {auction.status}
          </Badge>
        </Flex>

        <VStack align="start" gap={1} mb={5}>
          <Text color="muted" fontSize="sm">
            Current Bid
          </Text>

          <Heading
            size="2xl"
            color="primary"
            fontWeight="800"
            letterSpacing="-0.03em"
          >
            ₹{Number(auction.current_price).toLocaleString()}
          </Heading>
        </VStack>

        <Separator mb={5} />

        <Box mt="auto">
          <Button
            asChild
            bg="primary"
            color="white"
            w="full"
            size="lg"
            variant="subtle"
            colorPalette="brand"
          >
            <NextLink
              href={`/auctions/${auction.id}`}
              data-testid={`view-auction-${auction.id}`}
            >
              View Auction →
            </NextLink>
          </Button>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
