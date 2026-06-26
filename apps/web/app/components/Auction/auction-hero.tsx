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
import { formatAuctionDate } from "../../../utils";
import { AuctionDetail } from "@repo/types";

type Props = {
  auction: AuctionDetail;
};

export function AuctionHero({ auction }: Props) {
  return (
    <Card.Root overflow="hidden">
      <Box data-testid="auction-hero" position="relative" w="100%" h="200px">
        <img
          loading="lazy"
          src={auction.imageUrl}
          alt={auction.title}
          style={{
            objectFit: "cover",
            borderRadius: "16px",
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
              Ends {formatAuctionDate(auction.end_time)}
            </Text>

            <Text fontSize="sm" color="fg.muted">
              Created {formatAuctionDate(auction.start_time)}
            </Text>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
