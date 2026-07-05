"use client";

import {
  Box,
  Card,
  Grid,
  Skeleton,
  SkeletonText,
  VStack,
} from "@chakra-ui/react";

type AuctionGridSkeletonProps = {
  count?: number;
};

export function AuctionGridSkeleton({ count = 8 }: AuctionGridSkeletonProps) {
  return (
    <Grid
      templateColumns={{
        base: "1fr",
        md: "repeat(2,1fr)",
        xl: "repeat(3,1fr)",
        "2xl": "repeat(4,1fr)",
      }}
      gap={6}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card.Root
          key={index}
          borderRadius="2xl"
          borderWidth="1px"
          borderColor="border"
          bg="bg.panel"
          overflow="hidden"
        >
          <Card.Body p={6}>
            <VStack align="stretch" gap={5}>
              <Skeleton h="150px" borderRadius="xl" />
              <Skeleton h="22px" w="90px" alignSelf="flex-end" />
              <SkeletonText noOfLines={2} />
              <Box>
                <Skeleton h="14px" w="90px" mb={3} />
                <Skeleton h="32px" w="160px" />
              </Box>
              <Skeleton h="44px" borderRadius="lg" />
            </VStack>
          </Card.Body>
        </Card.Root>
      ))}
    </Grid>
  );
}
