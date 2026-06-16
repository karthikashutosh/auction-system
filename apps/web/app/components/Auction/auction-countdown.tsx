"use client";

import { Badge, HStack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

type AuctionCountdownProps = {
  endTime: string;
};

function getTimeRemaining(endTime: string) {
  const distance = new Date(endTime).getTime() - Date.now();

  if (distance <= 0) {
    return null;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));

  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
  };
}

export function AuctionCountdown({ endTime }: AuctionCountdownProps) {
  const [time, setTime] = useState(getTimeRemaining(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(endTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  if (!time) {
    return <Badge colorPalette="red">Auction Ended</Badge>;
  }

  return (
    <HStack gap={2}>
      <Text fontWeight="bold">{time.days}d</Text>

      <Text fontWeight="bold">{time.hours}h</Text>

      <Text fontWeight="bold">{time.minutes}m</Text>

      <Text fontWeight="bold">{time.seconds}s</Text>
    </HStack>
  );
}
