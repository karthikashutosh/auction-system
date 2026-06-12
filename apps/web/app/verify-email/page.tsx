"use client";

import NextLink from "next/link";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";

export default function VerifyEmailPage() {
  return (
    <Flex
      minH="100vh"
      bg="bg"
      justify="center"
      align="center"
      p={6}
    >
      <Card.Root
        bg="surface"
        borderColor="border"
        borderWidth="1px"
        shadow="xl"
        w="full"
        maxW="500px"
      >
        <Card.Body p={10}>
          <VStack gap={6} textAlign="center">
            <Box fontSize="5xl">📧</Box>

            <Heading
              size="lg"
              color="text"
            >
              Verify Your Email
            </Heading>

            <Text color="muted">
              We've sent a verification link to your
              email address.
            </Text>

            <Text
              color="muted"
              fontSize="sm"
            >
              Please check your inbox and click the
              verification link to activate your
              account.
            </Text>

            <Button
              variant="outline"
              w="full"
            >
              Resend Verification Email
            </Button>

            <Button
              asChild
              colorPalette="brand"
              w="full"
            >
              <NextLink href="/login">
                Back to Login
              </NextLink>
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Flex>
  );
}