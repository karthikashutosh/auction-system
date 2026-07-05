"use client";

import { Box, Heading, Text, VStack } from "@chakra-ui/react";

export function MarketplaceHero() {
  return (
    <Box
      position="relative"
      overflow="hidden"
      borderRadius="2xl"
      px={{ base: 6, md: 10 }}
      py={{ base: 10, md: 14 }}
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      mb={8}
    >
      <Box
        position="absolute"
        inset={0}
        bgGradient="radial(circle at top right, rgba(99,102,241,0.18), transparent 55%)"
        pointerEvents="none"
      />

      <VStack align="start" gap={4} position="relative" zIndex={1} maxW="700px">
        <Text
          fontSize="sm"
          fontWeight="bold"
          color="primary"
          textTransform="uppercase"
          letterSpacing="0.15em"
        >
          🔥 Live Marketplace
        </Text>

        <Heading
          fontSize={{
            base: "3xl",
            md: "5xl",
          }}
          lineHeight="1.1"
          color="text"
          fontWeight="800"
          letterSpacing="-0.03em"
        >
          Discover, Bid & Win
        </Heading>

        <Text fontSize="lg" color="muted" maxW="600px" lineHeight="1.8">
          Browse live auctions, compete with other bidders in real time, and win
          exclusive items before time runs out.
        </Text>
      </VStack>
    </Box>
  );
}
