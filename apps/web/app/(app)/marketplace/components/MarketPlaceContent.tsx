"use client";

import { AuctionsResponse } from "@repo/types";
import { AuctionGridSkeleton } from "./AuctionGridSkeleton";
import { MarketplaceError } from "./MarketPlaceError";
import { EmptyMarketplace } from "./EmptyMarketPlace";
import { AuctionGrid } from "./AuctionGrid";

type MarketplaceContentProps = {
  isLoading: boolean;
  isError: boolean;
  items: AuctionsResponse["items"];
};

export function MarketplaceContent({
  isLoading,
  isError,
  items,
}: MarketplaceContentProps) {
  if (isLoading) {
    return <AuctionGridSkeleton />;
  }

  if (isError) {
    return <MarketplaceError />;
  }

  if (items.length === 0) {
    return <EmptyMarketplace />;
  }

  return <AuctionGrid items={items} />;
}
