"use client";

import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  VStack,
} from "@chakra-ui/react";
import { useParams } from "next/navigation";
import { useGetAuctionById } from "../../../../hooks/useGetAuctionById";
import { useAuthStore } from "../../../../store/auth.store";
import { AuctionDetails } from "../../../components/Auction/auction-details";
import { AuctionHero } from "../../../components/Auction/auction-hero";
import { AuctionMetrics } from "../../../components/Auction/auction-metrics";
import { AuctionStatusCard } from "../../../components/Auction/auction-status-card";
import { BidForm } from "../../../components/Auction/bid-form";
import { BidFeed } from "../../../components/Auction/bit-feed";
import NextLink from "next/link";

export default function AuctionDetailPage() {
  const router = useParams();

  const user = useAuthStore((state) => state.user);

  const { data } = useGetAuctionById(router.id as string);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <Box bg="bg" minH="100vh">
      <Container maxW="1400px" py={10}>
        <Flex justify="space-between" align="center" mb={8}>
          <Button asChild variant="subtle">
            <NextLink href="/">← Back to Marketplace</NextLink>
          </Button>

          <Badge colorPalette={data.status === "ACTIVE" ? "green" : "red"}>
            {data.status}
          </Badge>
        </Flex>

        <Grid
          templateColumns={{
            base: "1fr",
            xl: "minmax(0, 2fr) 420px",
          }}
          gap={8}
        >
          {/* LEFT */}
          <VStack align="stretch" gap={8}>
            <AuctionHero auction={data} />

            <AuctionMetrics
              startingPrice={data.starting_price}
              currentPrice={data.current_price}
              totalBids={data.total_bids}
              participants={data.participated_users}
            />

            <AuctionDetails
              description={data.description}
              ownerId={data.owner_name}
              isReserveMet={data.is_reserve_met}
              startTime={data.start_time}
              endTime={data.end_time}
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
              currentPrice={data.current_price}
              isReserveMet={data.is_reserve_met}
              startTime={data.start_time}
              endTime={data.end_time}
              status={data.status}
            />

            <BidForm
              currentPrice={data.current_price}
              disabled={data.is_owner}
            />

            <BidFeed
              bids={data.recent_bids_history}
              totalBids={data.total_bids}
            />
          </VStack>
        </Grid>
      </Container>
    </Box>
  );
}
