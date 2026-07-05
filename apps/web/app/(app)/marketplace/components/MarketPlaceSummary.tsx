"use client";

import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  HStack,
  Separator,
  Stat,
  Text,
} from "@chakra-ui/react";

type MarketplaceSummaryProps = {
  totalItems: number;
};

export function MarketplaceSummary({ totalItems }: MarketplaceSummaryProps) {
  return (
    <Card.Root
      mb={8}
      borderWidth="1px"
      borderColor="border"
      bg="bg.panel"
      borderRadius="2xl"
      overflow="hidden"
    >
      <Card.Body p={6}>
        <Flex
          justify="space-between"
          align={{ base: "start", md: "center" }}
          direction={{ base: "column", md: "row" }}
          gap={6}
        >
          <Box flex="1">
            <Heading size="lg" color="text" letterSpacing="-0.02em">
              Active Auctions
            </Heading>

            <Text mt={2} color="muted" maxW="560px">
              Browse premium items currently available for bidding. New auctions
              appear automatically as they're listed.
            </Text>
          </Box>

          <Badge
            colorPalette="green"
            px={4}
            py={2}
            borderRadius="full"
            fontSize="sm"
          >
            {totalItems} Live
          </Badge>
        </Flex>

        <Separator my={6} />

        <HStack gap={10} flexWrap="wrap">
          <Stat.Root>
            <Stat.Label>Total Active</Stat.Label>

            <Stat.ValueText>{totalItems}</Stat.ValueText>

            <Stat.HelpText>Available for bidding</Stat.HelpText>
          </Stat.Root>

          {/*
            Future Stats

            Ending Soon

            Watched

            Categories

            Highest Bid
          */}
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
