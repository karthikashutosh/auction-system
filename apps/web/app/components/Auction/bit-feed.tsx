"use client";

import {
  Avatar,
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { AuctionDetail } from "../../../hooks/useGetAuctionById";

const MotionBox = motion.create(Box);

type Props = {
  bids: AuctionDetail["recent_bids_history"];
  totalBids: number;
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

export function BidFeed({ bids, totalBids }: Props) {
  return (
    <Card.Root>
      <Card.Body maxH="400px" overflowY="auto">
        <VStack align="stretch" gap={4}>
          <Flex justify="space-between" align="center">
            <HStack>
              <Box w="8px" h="8px" borderRadius="full" bg="green.500" />
              <Heading size="sm">Live Bids</Heading>
            </HStack>

            <Badge colorPalette="blue">{totalBids} bids</Badge>
          </Flex>

          {bids.length === 0 ? (
            <Text textAlign="center" py={8} color="fg.muted">
              Be the first bidder on this auction.
            </Text>
          ) : (
            <AnimatePresence initial={false}>
              {bids.map((bid, index) => (
                <MotionBox
                  key={bid.id}
                  layout
                  initial={{
                    opacity: 0,
                    y: -20,
                    scale: 0.98,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  bg={index === 0 ? "green.subtle" : undefined}
                  borderColor={index === 0 ? "green.500" : undefined}
                >
                  <Flex justify="space-between" align="center">
                    <HStack>
                      <Avatar.Root size="sm">
                        <Avatar.Fallback>
                          {bid.name.charAt(0).toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar.Root>

                      <VStack align="start" gap={0}>
                        <HStack>
                          <Text fontWeight="medium">{bid.name}</Text>

                          {index === 0 && (
                            <Badge size="sm" colorPalette="green">
                              Latest
                            </Badge>
                          )}
                        </HStack>

                        <Text fontSize="xs" color="fg.muted">
                          {formatRelativeTime(bid.created_at)}
                        </Text>
                      </VStack>
                    </HStack>

                    <Text fontWeight="bold" color="green.500">
                      ₹{bid.amount.toLocaleString()}
                    </Text>
                  </Flex>
                </MotionBox>
              ))}
            </AnimatePresence>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
