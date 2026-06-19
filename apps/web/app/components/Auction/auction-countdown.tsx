"use client";

import { Badge, HStack, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type AuctionCountdownProps = {
  endTime: string;
};

const MotionText = motion.create(Text);

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

  const totalSeconds =
    time.days * 86400 + time.hours * 3600 + time.minutes * 60 + time.seconds;

  const isUrgent = totalSeconds < 300; // < 5 min

  return (
    <HStack gap={2}>
      <AnimatePresence mode="wait">
        <MotionText
          key={`${time.days}-${time.hours}-${time.minutes}-${time.seconds}`}
          fontWeight="bold"
          color={isUrgent ? "red.500" : undefined}
          initial={{
            opacity: 0,
            y: -8,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: isUrgent ? [1, 1.05, 1] : 1,
          }}
          exit={{
            opacity: 0,
            y: 8,
          }}
          transition={{
            duration: 0.2,
          }}
        >
          {time.days}d {time.hours}h {time.minutes}m {time.seconds}s
        </MotionText>
      </AnimatePresence>
    </HStack>
  );
}
