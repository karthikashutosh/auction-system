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

const bids = [
  {
    id: "1",
    bidderName: "John",
    amount: 12000,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    bidderName: "Alice",
    amount: 11800,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

const bidHistory = [
  {
    user: "Karthik",
    amount: "₹120,000",
    time: "2 mins ago",
  },
  {
    user: "Alex",
    amount: "₹115,000",
    time: "6 mins ago",
  },
  {
    user: "John",
    amount: "₹110,000",
    time: "12 mins ago",
  },
  {
    user: "Sarah",
    amount: "₹105,000",
    time: "20 mins ago",
  },
];

export default function AuctionDetailPage() {
  const router = useParams();

  const user = useAuthStore((state) => state.user);

  const { data } = useGetAuctionById(router.id as string);

  const isAuctionOwner = user?.id === data?.owner_id;

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
              totalBids={32}
              participants={18}
            />

            <AuctionDetails
              description={data.description}
              ownerId={data.owner_id}
              reservePrice={data.reserve_price}
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
              reservePrice={data.reserve_price}
              startTime={data.start_time}
              endTime={data.end_time}
              status={data.status}
            />

            <BidForm
              currentPrice={data.current_price}
              disabled={isAuctionOwner}
            />

            <BidFeed bids={bids} />
          </VStack>
        </Grid>
      </Container>
    </Box>
  );
}
