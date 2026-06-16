"use client";

import {
  Badge,
  Box,
  Card,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Auction } from "../../../hooks/useGetAuctionById";

type Props = {
  auction: Auction;
};

export function AuctionHero({ auction }: Props) {
  return (
    <Card.Root overflow="hidden">
      <Box
        h={{
          base: "320px",
          md: "520px",
        }}
      >
        <img
          src={auction.imageUrl}
          alt={auction.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </Box>

      <Card.Body>
        <VStack align="stretch" gap={4}>
          <Heading size="xl">{auction.title}</Heading>

          <HStack wrap="wrap" gap={3}>
            <Badge colorPalette={auction.status === "ACTIVE" ? "green" : "red"}>
              {auction.status}
            </Badge>

            <Text fontSize="sm" color="fg.muted">
              Ends {new Date(auction.end_time).toLocaleDateString()}
            </Text>

            <Text fontSize="sm" color="fg.muted">
              Created {new Date(auction.created_at).toLocaleDateString()}
            </Text>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
