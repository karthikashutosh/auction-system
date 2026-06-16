"use client";

import { Box, Progress, Text, VStack } from "@chakra-ui/react";

type Props = {
  startTime: string;
  endTime: string;
};

export function AuctionProgress({ startTime, endTime }: Props) {
  const start = new Date(startTime).getTime();

  const end = new Date(endTime).getTime();

  const now = Date.now();

  const total = end - start;

  const elapsed = Math.max(0, now - start);

  const percentage = Math.min(100, Math.round((elapsed / total) * 100));

  return (
    <VStack align="stretch" gap={2}>
      <Text fontSize="sm" color="fg.muted">
        Auction Progress
      </Text>

      <Progress.Root value={percentage}>
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>

      <Box>
        <Text fontSize="sm" color="fg.muted">
          {percentage}% completed
        </Text>
      </Box>
    </VStack>
  );
}
