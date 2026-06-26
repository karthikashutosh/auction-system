"use client";

import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  SignupExtendedDto,
  signupExtendedSchema,
  type SignupDto,
} from "@repo/shared";
import { useRouter } from "next/navigation";
import { PasswordInput } from "../components/ui/password-input";
import { useSignup } from "../../hooks/useSignup";

export default function SignupPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupExtendedDto>({
    resolver: zodResolver(signupExtendedSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { mutateAsync, isPending } = useSignup();

  const onSubmit = async (data: SignupDto) =>
    mutateAsync(data, {
      onSuccess: () => {
        router.push("/login");
      },
    });

  return (
    <Flex minH="100vh" bg="bg">
      {/* Branding Section */}
      <Flex
        flex={1}
        display={{ base: "none", lg: "flex" }}
        justify="center"
        align="center"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          inset={0}
          bgGradient="linear(to-br, brand.900, brand.700)"
          opacity={0.2}
        />

        <VStack align="start" gap={6} maxW="520px" zIndex={1} px={12}>
          <Text color="primary" fontWeight="bold" letterSpacing="widest">
            AUCTIONFLOW
          </Text>

          <Heading size="2xl" color="text" lineHeight="1.1">
            Join the future of live auctions.
          </Heading>

          <Text color="muted" fontSize="lg" lineHeight="tall">
            Create an account to participate in real-time bidding, manage
            auctions, receive instant notifications, and track your activity.
          </Text>

          <HStack gap={4}>
            <Card.Root bg="surface" borderColor="border" borderWidth="1px">
              <Card.Body>
                <Text color="text" fontWeight="bold">
                  10K+
                </Text>
                <Text color="muted" fontSize="sm">
                  Active Users
                </Text>
              </Card.Body>
            </Card.Root>

            <Card.Root bg="surface" borderColor="border" borderWidth="1px">
              <Card.Body>
                <Text color="text" fontWeight="bold">
                  ₹12M+
                </Text>
                <Text color="muted" fontSize="sm">
                  Total Bids
                </Text>
              </Card.Body>
            </Card.Root>
          </HStack>
        </VStack>
      </Flex>

      {/* Signup Form */}
      <Flex flex={1} justify="center" align="center" p={6}>
        <Card.Root
          bg="surface"
          borderColor="border"
          borderWidth="1px"
          shadow="xl"
          w="full"
          maxW="420px"
        >
          <Card.Body p={8}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack gap={5}>
                <Box textAlign="center">
                  <Heading color="text" size="lg">
                    Create Account
                  </Heading>

                  <Text color="muted" mt={2}>
                    Start your auction journey
                  </Text>
                </Box>

                <Box w="full">
                  <Input
                    size="lg"
                    data-testid="signup-name-input"
                    placeholder="Full Name"
                    {...register("name")}
                  />

                  {errors.name && (
                    <Text mt={1} fontSize="sm" color="red.500">
                      {errors.name.message}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Input
                    data-testid="signup-email-input"
                    size="lg"
                    type="email"
                    placeholder="Email address"
                    {...register("email")}
                  />

                  {errors.email && (
                    <Text mt={1} fontSize="sm" color="red.500">
                      {errors.email.message}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <PasswordInput
                    data-testid="signup-password-input"
                    size="lg"
                    placeholder="Password"
                    {...register("password")}
                  />

                  {errors.password && (
                    <Text mt={1} fontSize="sm" color="red.500">
                      {errors.password.message}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <PasswordInput
                    data-testid="signup-confirm-password-input"
                    size="lg"
                    placeholder="Confirm Password"
                    {...register("confirmPassword")}
                  />

                  {errors.confirmPassword && (
                    <Text mt={1} fontSize="sm" color="red.500">
                      {errors.confirmPassword.message}
                    </Text>
                  )}
                </Box>

                <Button
                  data-testid="signup-button"
                  type="submit"
                  w="full"
                  size="lg"
                  colorPalette="brand"
                  loading={isPending}
                >
                  Create Account
                </Button>

                <Text color="muted" fontSize="sm" textAlign="center">
                  By creating an account, you agree to our Terms of Service and
                  Privacy Policy.
                </Text>

                <Text color="muted" fontSize="sm">
                  Already have an account?{" "}
                  <Text as="span" color="primary">
                    <NextLink href="/login">Sign In</NextLink>
                  </Text>
                </Text>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>
      </Flex>
    </Flex>
  );
}
