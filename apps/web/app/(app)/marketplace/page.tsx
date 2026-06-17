"use client";

import NextLink from "next/link";
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
import { useRouter } from "next/navigation";
import { useGetAuctions } from "../../../hooks/useGetAllAuctions";
import { useMe } from "../../../hooks/useMe";
import { useLogout } from "../../../hooks/userLogout";
import { useAuthStore } from "../../../store/auth.store";

export default function MarketplacePage() {
  const router = useRouter();
  const { mutateAsync, isPending } = useLogout();
  const { data: userData } = useMe();

  const user = useAuthStore((state) => state.user);

  const { data } = useGetAuctions({ limit: 10, page: 1 });

  const handleLogout = async () => {
    try {
      await mutateAsync();
      router.push("/login");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box bg="bg" minH="100vh">
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
            <Input placeholder="Search auctions..." w="320px" />

            <Button asChild colorPalette="brand">
              <NextLink href="/create">Create Auction</NextLink>
            </Button>

            <Menu.Root positioning={{ placement: "bottom-end" }}>
              <Menu.Trigger asChild>
                <Button
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
                        auction.status === "Active" ? "green" : "orange"
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
                    <NextLink href={`/auctions/${auction.id}`}>
                      View Auction
                    </NextLink>
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
