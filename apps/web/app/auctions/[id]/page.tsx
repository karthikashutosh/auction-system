"use client";

import NextLink from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  Progress,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";

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
  return (
    <Box bg="bg" minH="100vh">
      <Container maxW="7xl" py={8}>
        <Flex justify="space-between" align="center" mb={8}>
          <Button asChild variant="ghost">
            <NextLink href="/">← Back</NextLink>
          </Button>

          <Badge colorPalette="green">ACTIVE</Badge>
        </Flex>

        <Grid
          templateColumns={{
            base: "1fr",
            lg: "2fr 1fr",
          }}
          gap={6}
        >
          {/* LEFT */}
          <VStack align="stretch" gap={6}>
            <Card.Root bg="surface" borderColor="border" borderWidth="1px">
              <Card.Body>
                <VStack align="stretch" gap={4}>
                  <Heading color="text" size="lg">
                    MacBook Pro M4
                  </Heading>

                  <Text color="muted">
                    Apple MacBook Pro M4, 16GB RAM, 512GB SSD, Space Black
                  </Text>

                  <Separator />

                  <Box>
                    <Text color="muted">Current Highest Bid</Text>

                    <Heading color="primary" size="2xl">
                      ₹120,000
                    </Heading>
                  </Box>

                  <Box>
                    <Text color="muted">Auction Progress</Text>

                    <Progress.Root value={72} size="sm">
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>

                    <Text mt={2} color="muted" fontSize="sm">
                      72% Complete
                    </Text>
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>

            <Card.Root bg="surface" borderColor="border" borderWidth="1px">
              <Card.Body>
                <Heading size="md" mb={5} color="text">
                  Place Your Bid
                </Heading>

                <VStack align="stretch" gap={4}>
                  <Input placeholder="Enter bid amount" size="lg" />

                  <Button size="lg" colorPalette="brand">
                    Place Bid
                  </Button>

                  <Text color="muted" fontSize="sm">
                    Minimum next bid: ₹125,000
                  </Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          </VStack>

          {/* RIGHT */}
          <VStack align="stretch" gap={6}>
            <Card.Root bg="surface" borderColor="border" borderWidth="1px">
              <Card.Body>
                <Heading size="sm" mb={4} color="text">
                  Auction Stats
                </Heading>

                <VStack align="stretch" gap={4}>
                  <Box>
                    <Text color="muted">Total Bids</Text>
                    <Text color="text" fontWeight="bold">
                      32
                    </Text>
                  </Box>

                  <Box>
                    <Text color="muted">Participants</Text>
                    <Text color="text" fontWeight="bold">
                      18
                    </Text>
                  </Box>

                  <Box>
                    <Text color="muted">Ends In</Text>
                    <Text color="text" fontWeight="bold">
                      02h 14m 22s
                    </Text>
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>

            <Card.Root bg="surface" borderColor="border" borderWidth="1px">
              <Card.Body>
                <Heading size="sm" mb={4} color="text">
                  Live Bid Feed
                </Heading>

                <VStack align="stretch" gap={4}>
                  {bidHistory.map((bid, index) => (
                    <Flex key={index} justify="space-between">
                      <Box>
                        <Text color="text">{bid.user}</Text>

                        <Text color="muted" fontSize="sm">
                          {bid.time}
                        </Text>
                      </Box>

                      <Text color="primary" fontWeight="bold">
                        {bid.amount}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              </Card.Body>
            </Card.Root>
          </VStack>
        </Grid>
      </Container>
    </Box>
  );
}
