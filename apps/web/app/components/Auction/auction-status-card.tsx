"use client";

import {
  Badge,
  Card,
  Heading,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";

import { AuctionCountdown } from "./auction-countdown";
import { AuctionProgress } from "./auction-progress";

type Props = {
  currentPrice: number;
  isReserveMet: boolean;
  startTime: string;
  endTime: string;
  status: string;
};

export function AuctionStatusCard({
  currentPrice,
  isReserveMet,
  startTime,
  endTime,
  status,
}: Props) {
  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={5}>
          <Badge
            alignSelf="flex-start"
            colorPalette={status === "ACTIVE" ? "green" : "red"}
          >
            {status}
          </Badge>

          <div>
            <Text fontSize="sm" color="fg.muted">
              Current Highest Bid
            </Text>

            <Heading mt={2} size="3xl" color="blue.500">
              ₹{Number(currentPrice).toLocaleString()}
            </Heading>
          </div>
          <Separator />

          <div>
            <Text fontSize="sm" color="fg.muted" mb={2}>
              Time Remaining
            </Text>
            <AuctionCountdown endTime={endTime} />
          </div>

          <Separator />
          <AuctionProgress startTime={startTime} endTime={endTime} />
          <Separator />

          <div>
            <Text fontSize="sm" color="fg.muted">
              Reserve Price Stage
            </Text>

            <Badge mt={3} colorPalette={isReserveMet ? "green" : "orange"}>
              {isReserveMet ? "Reserve Met" : "Reserve Not Met"}
            </Badge>
          </div>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
