"use client";

import NextLink from "next/link";
import { Box, Button, Heading, Icon, Text, VStack } from "@chakra-ui/react";
import { LuPackageSearch } from "react-icons/lu";

export function EmptyMarketplace() {
  return (
    <Box
      py={24}
      px={6}
      borderWidth="1px"
      borderRadius="2xl"
      borderColor="border"
      bg="bg.panel"
    >
      <VStack gap={6}>
        <Box
          w="72px"
          h="72px"
          borderRadius="full"
          bg="bg.muted"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={LuPackageSearch} boxSize={9} color="fg.muted" />
        </Box>

        <VStack gap={2}>
          <Heading size="lg" color="text">
            No Active Auctions
          </Heading>

          <Text color="muted" textAlign="center" maxW="500px">
            There are no active auctions at the moment. Create your first
            auction and start accepting bids.
          </Text>
        </VStack>

        <Button asChild colorPalette="brand" size="lg">
          <NextLink href="/create">Create Auction</NextLink>
        </Button>
      </VStack>
    </Box>
  );
}
