"use client";

import NextLink from "next/link";
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Input,
  Text,
  Textarea,
  VStack,
  HStack,
  Badge,
} from "@chakra-ui/react";

export default function CreateAuctionPage() {
  return (
    <Box bg="bg" minH="100vh">
      <Container maxW="5xl" py={8}>
        <Flex
          justify="space-between"
          align="center"
          mb={8}
        >
          <Box>
            <Heading color="text">
              Create Auction
            </Heading>

            <Text color="muted">
              Publish a new auction to the marketplace
            </Text>
          </Box>

          <Button
            asChild
            variant="outline"
          >
            <NextLink href="/">
              Back to Marketplace
            </NextLink>
          </Button>
        </Flex>

        <Flex
          direction={{
            base: "column",
            lg: "row",
          }}
          gap={6}
        >
          {/* FORM */}
          <Card.Root
            flex={1}
            bg="surface"
            borderColor="border"
            borderWidth="1px"
          >
            <Card.Body>
              <VStack
                align="stretch"
                gap={5}
              >
                <Box>
                  <Text
                    mb={2}
                    color="text"
                  >
                    Auction Title
                  </Text>

                  <Input
                    placeholder="MacBook Pro M4"
                    size="lg"
                  />
                </Box>

                <Box>
                  <Text
                    mb={2}
                    color="text"
                  >
                    Description
                  </Text>

                  <Textarea
                    minH="140px"
                    placeholder="Describe your item..."
                  />
                </Box>

                <Box>
                  <Text
                    mb={2}
                    color="text"
                  >
                    Starting Price
                  </Text>

                  <Input
                    placeholder="100000"
                    type="number"
                    size="lg"
                  />
                </Box>

                <Box>
                  <Text
                    mb={2}
                    color="text"
                  >
                    Reserve Price
                  </Text>

                  <Input
                    placeholder="150000"
                    type="number"
                    size="lg"
                  />
                </Box>

                <Box>
                  <Text
                    mb={2}
                    color="text"
                  >
                    Auction End Date
                  </Text>

                  <Input
                    type="datetime-local"
                    size="lg"
                  />
                </Box>

                <Box>
                  <Text
                    mb={2}
                    color="text"
                  >
                    Image URL
                  </Text>

                  <Input
                    placeholder="https://..."
                    size="lg"
                  />
                </Box>

                <Button
                  size="lg"
                  colorPalette="brand"
                >
                  Create Auction
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* PREVIEW */}
          <Card.Root
            w={{
              base: "100%",
              lg: "380px",
            }}
            bg="surface"
            borderColor="border"
            borderWidth="1px"
          >
            <Card.Body>
              <VStack
                align="stretch"
                gap={4}
              >
                <Text
                  color="muted"
                  fontSize="sm"
                  textTransform="uppercase"
                >
                  Preview
                </Text>

                <Box
                  h="180px"
                  borderRadius="xl"
                  bg="blackAlpha.300"
                  border="1px solid"
                  borderColor="border"
                />

                <Heading
                  size="md"
                  color="text"
                >
                  MacBook Pro M4
                </Heading>

                <Text color="muted">
                  Apple Silicon • 16GB RAM •
                  512GB SSD
                </Text>

                <HStack>
                  <Badge colorPalette="purple">
                    New
                  </Badge>

                  <Badge colorPalette="green">
                    Active
                  </Badge>
                </HStack>

                <Box>
                  <Text color="muted">
                    Starting Price
                  </Text>

                  <Heading
                    size="lg"
                    color="primary"
                  >
                    ₹100,000
                  </Heading>
                </Box>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Flex>
      </Container>
    </Box>
  );
}