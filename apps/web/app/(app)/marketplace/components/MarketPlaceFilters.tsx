"use client";

import { Box, Button, HStack, Input, NativeSelect } from "@chakra-ui/react";

export function MarketplaceFilters() {
  return (
    <Box borderRadius="2xl" bg="bg.panel">
      <HStack gap={4} flexWrap="wrap" align="center">
        <Input
          placeholder="Search auctions..."
          flex="1"
          bg="white"
          minW={{
            base: "100%",
            md: "320px",
          }}
        />

        <NativeSelect.Root bg="white" w="180px">
          <NativeSelect.Field defaultValue="all">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="active">Ended</option>
          </NativeSelect.Field>

          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <NativeSelect.Root bg="white" w="180px">
          <NativeSelect.Field defaultValue="endingSoon">
            <option value="endingSoon">Ending Soon</option>
            <option value="newest">Newest</option>
            <option value="highestBid">Highest Bid</option>
            <option value="lowestBid">Lowest Bid</option>
            <option value="az">Title (A-Z)</option>
          </NativeSelect.Field>

          <NativeSelect.Indicator />
        </NativeSelect.Root>

        <Button bg="primary" color="white" colorPalette="gray">
          Clear Filters
        </Button>
      </HStack>
    </Box>
  );
}
