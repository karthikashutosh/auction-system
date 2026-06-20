"use client";

import NextLink from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin } from "@react-oauth/google";

import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Input,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";

import { PasswordInput } from "../components/ui/password-input";

import { loginSchema, type LoginDto } from "@repo/shared";
import { useLogin } from "../../hooks/userLogin";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "../../hooks/useGoogleAuth";

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const router = useRouter();

  const { mutateAsync: loginAsync, isPending } = useLogin();

  const { mutate: googleLogin } = useGoogleLogin();

  const onSubmit = async (data: LoginDto) => {
    loginAsync(data, {
      onSuccess: () => router.push("/"),
    });
  };

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
            Real-time auctions built for scale.
          </Heading>

          <Text color="muted" fontSize="lg" lineHeight="tall">
            Experience live bidding, instant updates, notifications, caching,
            and high-performance auction workflows.
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

      {/* Login Form */}
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
              <VStack gap={6}>
                <Box textAlign="center">
                  <Heading color="text" size="lg">
                    Welcome Back
                  </Heading>

                  <Text color="muted" mt={2}>
                    Sign in to continue
                  </Text>
                </Box>

                <Box w="full">
                  <Input
                    size="lg"
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

                <Button
                  type="submit"
                  w="full"
                  size="lg"
                  colorPalette="brand"
                  loading={isPending}
                >
                  Sign In
                </Button>
                <Flex w="full" align="center" gap={4}>
                  <Separator flex={1} />
                  <Text color="muted" fontSize="sm">
                    OR
                  </Text>
                  <Separator flex={1} />
                </Flex>

                <Button asChild variant="outline" w="full" size="lg">
                  {/* <NextLink href="/">Continue as Guest</NextLink> */}
                  <GoogleLogin
                    theme="filled_black"
                    onSuccess={(credentialResponse) => {
                      googleLogin(credentialResponse.credential as string);
                    }}
                  />
                </Button>

                <Text color="muted" fontSize="sm">
                  Don't have an account?{" "}
                  <NextLink href="/signup">
                    <Text as="span" color="primary" fontWeight="medium">
                      Create account
                    </Text>
                  </NextLink>
                </Text>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>
      </Flex>
    </Flex>
  );
}
