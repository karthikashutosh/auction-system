"use client";

import { Box, Button, Container, Flex, Grid, VStack } from "@chakra-ui/react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useAuctionEvents } from "../../../../hooks/useAuctionEvents";
import { useGetAuctionById } from "../../../../hooks/useGetAuctionById";
import { AuctionDetails } from "../../../components/Auction/auction-details";
import { AuctionHero } from "../../../components/Auction/auction-hero";
import { AuctionMetrics } from "../../../components/Auction/auction-metrics";
import { AuctionStatusCard } from "../../../components/Auction/auction-status-card";
import { BidForm } from "../../../components/Auction/bid-form";
import { BidFeed } from "../../../components/Auction/bit-feed";

export default function AuctionDetailPage() {
  const router = useParams();

  const { data } = useGetAuctionById(router.id as string);

  useAuctionEvents(router.id as string);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <Box bg="bg" minH="100vh">
      <Container maxW="1400px" py={4}>
        <Flex justify="space-between" align="center" mb={8}>
          <Button asChild variant="subtle">
            <NextLink href="/">← Back to Marketplace</NextLink>
          </Button>
        </Flex>

        <Grid
          templateColumns={{
            base: "1fr",
            xl: "1.5fr 1fr",
          }}
          gap={4}
        >
          {/* LEFT */}
          <VStack align="stretch" gap={8}>
            <AuctionHero auction={data} />
            <AuctionDetails
              description={data.description}
              ownerName={data.owner_name}
              startTime={data.start_time}
              endTime={data.end_time}
            />
            <BidFeed
              bids={data.recent_bids_history}
              totalBids={data.total_bids}
            />
          </VStack>

          {/* RIGHT */}
          <VStack
            align="stretch"
            gap={6}
            position={{
              base: "static",
              xl: "sticky",
            }}
            top="24px"
            h="fit-content"
          >
            <AuctionStatusCard
              title={data.title}
              currentPrice={data.current_price}
              isReserveMet={data.is_reserve_met}
              endTime={data.end_time}
              status={data.status}
            />
            {data.status == "ACTIVE" && (
              <BidForm
                currentPrice={data.current_price}
                disabled={data.is_owner}
              />
            )}

            <AuctionMetrics
              startingPrice={data.starting_price}
              totalBids={data.total_bids}
              participants={data.participated_users}
            />
          </VStack>
        </Grid>
      </Container>
    </Box>
  );
}
