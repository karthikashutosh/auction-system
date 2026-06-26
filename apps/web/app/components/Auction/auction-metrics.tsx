"use client";

import { Card, Grid, Heading, Stat } from "@chakra-ui/react";

type Props = {
  startingPrice: number;
  totalBids: number;
  participants: number;
};

export function AuctionMetrics({
  startingPrice,
  totalBids,
  participants,
}: Props) {
  return (
    <Card.Root data-testid="auction-metrics">
      <Card.Body>
        <Heading size="sm" mb={4}>
          Auction Stats
        </Heading>

        <Grid templateColumns="repeat(3, 1fr)" gap={4}>
          <Stat.Root>
            <Stat.Label>Starting Price</Stat.Label>

            <Stat.ValueText>
              ₹{Number(startingPrice).toLocaleString()}
            </Stat.ValueText>
          </Stat.Root>

          <Stat.Root>
            <Stat.Label>Total Bids</Stat.Label>

            <Stat.ValueText>{totalBids}</Stat.ValueText>
          </Stat.Root>

          <Stat.Root>
            <Stat.Label>Participants</Stat.Label>

            <Stat.ValueText>{participants}</Stat.ValueText>
          </Stat.Root>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
