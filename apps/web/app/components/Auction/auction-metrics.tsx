"use client";

import { Card, Grid, GridItem, Heading, Text, VStack } from "@chakra-ui/react";

type Props = {
  startingPrice: string;
  currentPrice: string;
  totalBids?: number;
  participants?: number;
};

export function AuctionMetrics({
  startingPrice,
  currentPrice,
  totalBids = 0,
  participants = 0,
}: Props) {
  const start = Number(startingPrice);
  const current = Number(currentPrice);

  const growth = start > 0 ? ((current - start) / start) * 100 : 0;

  const metrics = [
    {
      label: "Current Bid",
      value: `₹${current.toLocaleString()}`,
    },
    {
      label: "Starting Price",
      value: `₹${start.toLocaleString()}`,
    },
    {
      label: "Total Bids",
      value: totalBids.toLocaleString(),
    },
    {
      label: "Participants",
      value: participants.toLocaleString(),
    },
    {
      label: "Growth",
      value: `${growth.toFixed(1)}%`,
    },
  ];

  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={5}>
          <Heading size="md">Auction Metrics</Heading>

          <Grid
            templateColumns={{
              base: "1fr 1fr",
              md: "repeat(5, 1fr)",
            }}
            gap={4}
          >
            {metrics.map((metric) => (
              <GridItem key={metric.label}>
                <Text fontSize="sm" color="fg.muted">
                  {metric.label}
                </Text>

                <Text mt={1} fontSize="xl" fontWeight="bold">
                  {metric.value}
                </Text>
              </GridItem>
            ))}
          </Grid>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
