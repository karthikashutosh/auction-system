"use client";

import {
  Avatar,
  Card,
  Flex,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";

export type BidFeedItem = {
  id: string;
  bidderName: string;
  amount: number;
  createdAt: string;
};

type Props = {
  bids: BidFeedItem[];
};

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();

  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

export function BidFeed({ bids }: Props) {
  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          <Heading size="sm">Live Bid Activity</Heading>

          {bids.length === 0 ? (
            <Text textAlign="center" py={8} color="fg.muted">
              Be the first bidder on this auction.
            </Text>
          ) : (
            bids.map((bid) => (
              <Flex key={bid.id} justify="space-between" align="center">
                <HStack>
                  <Avatar.Root size="sm">
                    <Avatar.Fallback>
                      {bid.bidderName.charAt(0).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar.Root>

                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">{bid.bidderName}</Text>

                    <Text fontSize="xs" color="fg.muted">
                      {formatRelativeTime(bid.createdAt)}
                    </Text>
                  </VStack>
                </HStack>

                <Text fontWeight="bold" color="green.500">
                  ₹{bid.amount.toLocaleString()}
                </Text>
              </Flex>
            ))
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
