"use client";

import {
  Avatar,
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
  Menu,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useState } from "react";
import { LoadingScreen } from "../../../components/ui/loadingPage";
import { useGetAuctions } from "../../../hooks/useGetAllAuctions";
import { useLogout } from "../../../hooks/userLogout";
import { AuctionsResponse } from "@repo/types";
import { Notification } from "../../components/Notifications/Notifications";
import PaginatedLayout from "../../../components/ui/PaginatedLayout";

export default function MarketplacePage() {
  const { mutateAsync, isPending } = useLogout();
  const [page, setPage] = useState(1);

  const { data, isLoading: auctionLoading } = useGetAuctions({
    limit: 10,
    page,
  });

  const pagination = data?.pagination as AuctionsResponse["pagination"];

  const handleLogout = async () => {
    try {
      await mutateAsync();
    } catch (error) {
      console.error(error);
    }
  };

  if (!data) {
    return null;
  }

  if (auctionLoading) return <LoadingScreen />;

  return (
    <PaginatedLayout
      currentPage={page}
      totalPages={pagination.totalPages}
      totalItems={pagination.totalItems}
      limit={10}
      hasNextPage={pagination.hasNextPage}
      hasPreviousPage={pagination.hasPreviousPage}
      onPageChange={setPage}
    >
      <Container maxW="7xl" py={8}>
        <Flex
          justify="space-between"
          align="center"
          mb={10}
          gap={4}
          flexWrap="wrap"
        >
          <Box>
            <Heading size="lg" color="text">
              AuctionFlow
            </Heading>

            <Text color="muted">Real-time auction marketplace</Text>
          </Box>

          <HStack gap={4}>
            {/* <Input placeholder="Search auctions..." w="320px" /> */}

            <Button
              asChild
              data-testid="create-auction-nav-button"
              colorPalette="brand"
            >
              <NextLink href="/create">Create Auction</NextLink>
            </Button>
            <Notification />
            <Menu.Root positioning={{ placement: "bottom-end" }}>
              <Menu.Trigger asChild>
                <Button
                  data-testid="profile-menu-button"
                  variant="ghost"
                  p={0}
                  minW="auto"
                  h="auto"
                  borderRadius="full"
                >
                  <Avatar.Root>
                    <Avatar.Fallback name="Guest" />
                  </Avatar.Root>
                </Button>
              </Menu.Trigger>

              <Portal>
                <Menu.Positioner>
                  <Menu.Content p={2}>
                    <Button
                      data-testid="logout-button"
                      colorPalette="red"
                      size="sm"
                      width="full"
                      loading={isPending}
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </HStack>
        </Flex>

        <Card.Root mb={8} bg="surface" borderColor="border" borderWidth="1px">
          <Card.Body>
            <Flex
              justify="space-between"
              align="center"
              flexWrap="wrap"
              gap={4}
            >
              <Box>
                <Heading size="md" color="text">
                  Active Auctions
                </Heading>

                <Text color="muted">Browse live auctions and place bids</Text>
              </Box>

              <Badge colorPalette="purple" px={3} py={1}>
                {data?.pagination.totalItems} Auctions Live
              </Badge>
            </Flex>
          </Card.Body>
        </Card.Root>

        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2,1fr)",
            xl: "repeat(3,1fr)",
          }}
          gap={6}
        >
          {data?.items.map((auction) => (
            <Card.Root
              key={auction.id}
              data-testid={`auction-card-${auction.id}`}
              bg="surface"
              borderColor="border"
              borderWidth="1px"
              transition="all .2s ease"
              _hover={{
                transform: "translateY(-4px)",
                borderColor: "primary",
              }}
            >
              <Card.Body>
                <VStack align="stretch" gap={4}>
                  <Flex justify="space-between" align="center">
                    <Heading size="sm" color="text">
                      {auction.title}
                    </Heading>

                    <Badge
                      colorPalette={
                        auction.status === "ACTIVE" ? "green" : "red"
                      }
                    >
                      {auction.status}
                    </Badge>
                  </Flex>

                  <Box>
                    <Text color="muted" fontSize="sm">
                      Current Bid
                    </Text>

                    <Heading size="lg" color="primary">
                      {auction.current_price}
                    </Heading>
                  </Box>

                  {/* <Text color="muted">{auction.bids} bids placed</Text> */}

                  <Button asChild colorPalette="brand" variant="subtle">
                    <NextLink
                      data-testid={`view-auction-${auction.id}`}
                      href={`/auctions/${auction.id}`}
                    >
                      View Auction
                    </NextLink>
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>
          ))}
        </Grid>
      </Container>
    </PaginatedLayout>
  );
}
