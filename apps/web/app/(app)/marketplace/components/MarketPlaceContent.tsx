"use client";

import { Box, Heading, Text } from "@chakra-ui/react";
import { AuctionsResponse } from "@repo/types";
import { AuctionGrid } from "./AuctionGrid";
import { AuctionGridSkeleton } from "./AuctionGridSkeleton";
import { EmptyMarketplace } from "./EmptyMarketPlace";
import { MarketplaceError } from "./MarketPlaceError";

type MarketplaceContentProps = {
  isLoading: boolean;
  isError: boolean;
  items: AuctionsResponse["items"];
  /** Set while showing search results so the empty state can say "no matches". */
  searchQuery?: string;
  onRetry?: () => void;
};

export function MarketplaceContent({
  isLoading,
  isError,
  items,
  searchQuery,
  onRetry,
}: MarketplaceContentProps) {
  if (isLoading) {
    return <AuctionGridSkeleton />;
  }

  if (isError) {
    return <MarketplaceError onRetry={onRetry} />;
  }

  if (items.length === 0) {
    if (searchQuery) {
      return (
        <Box py={20} textAlign="center" data-testid="search-empty">
          <Heading size="lg">No matches for “{searchQuery}”</Heading>
          <Text color="muted" mt={2}>
            Try a broader description, or a different brand or model.
          </Text>
        </Box>
      );
    }
    return <EmptyMarketplace />;
  }

  return <AuctionGrid items={items} />;
}
