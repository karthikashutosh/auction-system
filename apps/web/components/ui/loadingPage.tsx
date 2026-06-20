"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Gavel } from "lucide-react";
import { useMemo } from "react";

const MotionBox = motion.create(Box);

const LOADING_MESSAGES = [
  "🔨 Warming up the auction floor...",
  "💰 Checking your latest bids...",
  "📦 Gathering your active auctions...",
  "👀 Looking for outbid alerts...",
  "🚀 Preparing your dashboard...",
];

export function LoadingScreen() {
  const message = useMemo(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
    []
  );

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <VStack gap={5}>
        <MotionBox
          animate={{
            rotate: [0, -8, 8, -8, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Gavel size={40} strokeWidth={1.5} />
        </MotionBox>

        <Text fontSize="lg" fontWeight="semibold" textAlign="center">
          {message}
        </Text>
      </VStack>
    </Box>
  );
}
