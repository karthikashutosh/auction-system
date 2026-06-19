"use client";

import {
  Badge,
  Card,
  Heading,
  HStack,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";

import { AuctionCountdown } from "./auction-countdown";

type Props = {
  title: string;
  currentPrice: number;
  isReserveMet: boolean;
  endTime: string;
  status: string;
};

export function AuctionStatusCard({
  title,
  currentPrice,
  isReserveMet,
  endTime,
  status,
}: Props) {
  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={5}>
          <HStack justify="space-between">
            <Badge colorPalette={status === "ACTIVE" ? "green" : "red"}>
              {status}
            </Badge>

            <Badge colorPalette={isReserveMet ? "green" : "orange"}>
              {isReserveMet ? "Reserve Met" : "Reserve Not Met"}
            </Badge>
          </HStack>

          <VStack align="start" gap={1}>
            <Heading size="md" lineClamp={2}>
              {title}
            </Heading>

            <Text fontSize="sm" color="fg.muted">
              Current Highest Bid
            </Text>

            <Heading size="3xl" color="blue.500">
              ₹{currentPrice.toLocaleString()}
            </Heading>
          </VStack>

          <Separator />

          <VStack align="start" gap={2}>
            <Text fontSize="sm" color="fg.muted">
              Time Remaining
            </Text>

            <AuctionCountdown endTime={endTime} />
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
