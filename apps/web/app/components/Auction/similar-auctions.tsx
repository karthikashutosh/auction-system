"use client";

import { Box, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import { useSimilarAuctions } from "../../../hooks/useSimilarAuctions";
import { AuctionCard } from "../../(app)/marketplace/components/AuctionCard";

export function SimilarAuctions({ auctionId }: { auctionId: string }) {
  const { data, isLoading } = useSimilarAuctions(auctionId);

  if (isLoading || !data || data.items.length === 0) return null;

  return (
    <Box data-testid="similar-auctions">
      <Heading size="md" mb={1}>
        Similar listings
      </Heading>
      <Text color="muted" fontSize="sm" mb={4}>
        Picked by meaning, not just matching words.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {data.items.slice(0, 4).map((a) => (
          <AuctionCard key={a.id} auction={a} />
        ))}
      </SimpleGrid>
    </Box>
  );
}
