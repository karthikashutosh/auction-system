"use client";

import { Box, Button, HStack, Input } from "@chakra-ui/react";

type MarketplaceFiltersProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MarketplaceFilters({
  value,
  onChange,
}: MarketplaceFiltersProps) {
  return (
    <Box borderRadius="2xl" bg="bg.panel" mt={4}>
      <HStack gap={4} flexWrap="wrap" align="center">
        <Input
          data-testid="marketplace-search-input"
          placeholder="Search auctions, e.g. “camera for film photography”…"
          flex="1"
          bg="white"
          value={value}
          maxLength={200}
          onChange={(e) => onChange(e.target.value)}
          minW={{
            base: "100%",
            md: "320px",
          }}
        />

        {value && (
          <Button
            bg="primary"
            color="white"
            colorPalette="gray"
            onClick={() => onChange("")}
          >
            Clear
          </Button>
        )}
      </HStack>
    </Box>
  );
}
