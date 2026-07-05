"use client";

import { SimpleGrid } from "@chakra-ui/react";
import { AuctionsResponse } from "@repo/types";

import { AuctionCard } from "./AuctionCard";

type AuctionGridProps = {
  items: AuctionsResponse["items"];
};

export function AuctionGrid({ items }: AuctionGridProps) {
  return (
    <SimpleGrid
      columns={{
        base: 1,
        md: 2,
        xl: 3,
        "2xl": 4,
      }}
      gap={6}
      alignItems="stretch"
    >
      {items.map((auction) => (
        <AuctionCard key={auction.id} auction={auction} />
      ))}
    </SimpleGrid>
  );
}
