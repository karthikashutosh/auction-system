"use client";

import { useRouter } from "next/navigation";
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
import { useMyAuctions } from "../../../hooks/useGetMyAuctions";

export default function MyAuctionsPage() {
  const router = useRouter();

  const { data, isLoading } = useMyAuctions({
    page: 1,
    limit: 12,
  });

  if (isLoading) {
    return (
      <Center h="60vh">
        <Spinner size="lg" />
      </Center>
    );
  }

  if (!data?.items.length) {
    return (
      <Center h="70vh">
        <VStack gap={4}>
          <Text fontSize="5xl">📦</Text>

          <Heading size="lg">No auctions yet</Heading>

          <Text color="gray.500">
            Create your first auction and start receiving bids.
          </Text>

          <Button colorScheme="blue" onClick={() => router.push("/create")}>
            Create Auction
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={8}>
      <Flex justify="space-between" align="center" mb={8}>
        <Box>
          <Heading size="xl">My Auctions</Heading>

          <Text color="gray.500" mt={2}>
            Manage and track your auctions
          </Text>
        </Box>

        <Button colorScheme="blue" onClick={() => router.push("/create")}>
          Create Auction
        </Button>
      </Flex>

      <Text color="gray.500" mb={6}>
        Total Auctions: {data.pagination.totalItems}
      </Text>

      <SimpleGrid
        columns={{
          base: 1,
          md: 2,
          xl: 3,
        }}
        gap={6}
      >
        {data.items.map((auction) => (
          <Box
            key={auction.id}
            role="button"
            tabIndex={0}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            p={6}
            cursor="pointer"
            transition="all .2s ease"
            _hover={{
              transform: "translateY(-4px)",
              shadow: "lg",
            }}
            onClick={() => router.push(`/auctions/${auction.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                router.push(`/auctions/${auction.id}`);
              }
            }}
          >
            <VStack align="stretch" gap={4}>
              <Flex justify="space-between">
                <Badge
                  colorPalette={auction.status === "ACTIVE" ? "green" : "red"}
                  borderRadius="full"
                  px={3}
                  py={1}
                >
                  {auction.status}
                </Badge>

                <Text fontSize="sm" color="gray.500">
                  Ends {new Date(auction.end_time).toLocaleDateString()}
                </Text>
              </Flex>

              <Box>
                <Text fontSize="xl" fontWeight="bold" mb={2}>
                  {auction.title}
                </Text>

                <Text maxLines={2} color="gray.600">
                  {auction.description}
                </Text>
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.500">
                  Current Bid
                </Text>

                <Text fontSize="2xl" fontWeight="bold">
                  ₹{Number(auction.current_price).toLocaleString()}
                </Text>
              </Box>

              <Flex justify="space-between" align="center" pt={2}>
                <Text fontSize="sm" color="gray.500">
                  Created {new Date(auction.created_at).toLocaleDateString()}
                </Text>

                <Text fontWeight="semibold" color="blue.500">
                  View →
                </Text>
              </Flex>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
