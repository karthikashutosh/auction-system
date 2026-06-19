"use client";

import { Card, Grid, Heading, Separator, Text, VStack } from "@chakra-ui/react";

import { formatAuctionDate } from "../../../utils";

type Props = {
  description: string;
  ownerName: string;
  startTime: string;
  endTime: string;
};

export function AuctionDetails({
  description,
  ownerName,
  startTime,
  endTime,
}: Props) {
  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={6}>
          {/* Description */}
          <div>
            <Heading size="md" mb={3}>
              Description
            </Heading>

            <Text color="fg.muted" lineHeight="tall" whiteSpace="pre-wrap">
              {description}
            </Text>
          </div>

          <Separator />

          {/* Auction Info */}
          <div>
            <Heading size="sm" mb={4}>
              Auction Information
            </Heading>

            <Grid
              templateColumns={{
                base: "1fr",
                md: "repeat(3, 1fr)",
              }}
              gap={5}
            >
              <div>
                <Text color="fg.muted" fontSize="sm">
                  Seller
                </Text>

                <Text fontWeight="medium" mt={1}>
                  {ownerName}
                </Text>
              </div>

              <div>
                <Text color="fg.muted" fontSize="sm">
                  Listed On
                </Text>

                <Text mt={1}>{formatAuctionDate(startTime)}</Text>
              </div>

              <div>
                <Text color="fg.muted" fontSize="sm">
                  Ends On
                </Text>

                <Text mt={1}>{formatAuctionDate(endTime)}</Text>
              </div>
            </Grid>
          </div>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
