"use client";

import { Heading } from "@chakra-ui/react";
import { useGetBidsByAuctionId } from "../../../hooks/useGetBidsByAuctionId";

export default function DashboardPage() {
  const { data, isLoading } = useGetBidsByAuctionId({
    limit: 10,
    page: 1,
  });

  console.log("data", data);

  return <Heading>My Bids</Heading>;
}
