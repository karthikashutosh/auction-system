"use client";

import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";
import { useMyAuctions } from "../../../hooks/useGetMyAuctions";
import { formatAuctionDate, formatTimeRemaining } from "../../../utils";

const MotionBox = motion.create(Box);

export default function MyAuctionsPage() {
  const router = useRouter();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyAuctions();

  const auctions = data?.pages.flatMap((page) => page.items) ?? [];

  useIntersectionObserver({
    target: loadMoreRef,
    enabled: hasNextPage && !isFetchingNextPage,
    onIntersect: fetchNextPage,
  });

  if (isLoading) {
    return (
      <Center h="60vh">
        <Spinner size="lg" />
      </Center>
    );
  }

  if (!auctions.length) {
    return (
      <Center h="70vh">
        <VStack gap={4}>
          <Text fontSize="5xl">📦</Text>

          <Heading size="lg">No auctions yet</Heading>

          <Text color="fg.muted">
            Create your first auction and start receiving bids.
          </Text>

          <Button colorPalette="brand" onClick={() => router.push("/create")}>
            Create Auction
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center" p={8} wrap="wrap" gap={4}>
        <Box>
          <Heading size="xl">My Auctions</Heading>

          <Text color="fg.muted" mb={6}>
            Showing {auctions.length} auctions
          </Text>

          <Text color="fg.muted" mt={2}>
            Manage and track your auctions
          </Text>
        </Box>

        <Button colorPalette="brand" onClick={() => router.push("/create")}>
          Create Auction
        </Button>
      </Flex>

      <SimpleGrid
        p={8}
        columns={{
          base: 1,
          md: 2,
          xl: 3,
        }}
        gap={6}
      >
        {auctions.map((auction, index) => (
          <MotionBox
            key={auction.id}
            role="button"
            tabIndex={0}
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border"
            borderRadius="xl"
            p={2}
            minH="220px"
            maxH="220px"
            cursor="pointer"
            overflow="hidden"
            position="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
            }}
            whileHover={{
              y: -6,
              boxShadow:
                "0 0 0 1px rgba(59,130,246,.4), 0 12px 32px rgba(59,130,246,.15)",
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(`/auctions/${auction.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                router.push(`/auctions/${auction.id}`);
              }
            }}
          >
            <VStack align="stretch" gap={3} h="100%">
              <Flex justify="space-between" align="center">
                <Badge
                  colorPalette={auction.status === "ACTIVE" ? "green" : "red"}
                  borderRadius="full"
                  px={2}
                  py={0.5}
                >
                  {auction.status}
                </Badge>

                <Text fontSize="xs" color="fg.muted">
                  {formatTimeRemaining(auction.end_time)}
                </Text>
              </Flex>

              <Box>
                <Heading size="sm" lineClamp={1} mb={1}>
                  {auction.title}
                </Heading>

                <Text fontSize="sm" color="fg.muted" lineClamp={2}>
                  {auction.description}
                </Text>
              </Box>

              <Box>
                <Text
                  fontSize="xs"
                  color="fg.muted"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Current Bid
                </Text>

                <Heading size="lg" color="primary">
                  ₹{Number(auction.current_price).toLocaleString()}
                </Heading>
              </Box>

              <Flex
                mt="auto"
                pt={3}
                borderTopWidth="1px"
                borderColor="border"
                justify="space-between"
                align="center"
              >
                <Text fontSize="xs" color="fg.muted">
                  {formatAuctionDate(auction.created_at)}
                </Text>

                <Text fontSize="sm" fontWeight="medium" color="primary">
                  View →
                </Text>
              </Flex>
            </VStack>
          </MotionBox>
        ))}
      </SimpleGrid>

      {hasNextPage && <Box ref={loadMoreRef} h="1px" />}

      {isFetchingNextPage && (
        <Center py={8}>
          <Spinner />
        </Center>
      )}
    </>
  );
}
