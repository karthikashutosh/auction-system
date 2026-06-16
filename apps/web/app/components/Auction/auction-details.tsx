"use client";

import { Card, Grid, Heading, Separator, Text, VStack } from "@chakra-ui/react";

type Props = {
  description: string;
  ownerId: string;
  startTime: string;
  endTime: string;
  reservePrice: string;
};

export function AuctionDetails({
  description,
  ownerId,
  startTime,
  endTime,
  reservePrice,
}: Props) {
  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={6}>
          <div>
            <Heading size="md" mb={3}>
              Description
            </Heading>

            <Text lineHeight="tall" color="fg.muted">
              {description}
            </Text>
          </div>

          <Separator />

          <div>
            <Heading size="md" mb={4}>
              Auction Information
            </Heading>

            <Grid
              templateColumns={{
                base: "1fr",
                md: "1fr 1fr",
              }}
              gap={5}
            >
              <div>
                <Text color="fg.muted" fontSize="sm">
                  Reserve Price
                </Text>

                <Text fontWeight="bold">
                  ₹{Number(reservePrice).toLocaleString()}
                </Text>
              </div>

              <div>
                <Text color="fg.muted" fontSize="sm">
                  Seller
                </Text>

                <Text fontWeight="bold">
                  {ownerId.slice(0, 8)}
                  ...
                </Text>
              </div>

              <div>
                <Text color="fg.muted" fontSize="sm">
                  Start Time
                </Text>

                <Text>{new Date(startTime).toLocaleString()}</Text>
              </div>

              <div>
                <Text color="fg.muted" fontSize="sm">
                  End Time
                </Text>

                <Text>{new Date(endTime).toLocaleString()}</Text>
              </div>
            </Grid>
          </div>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
