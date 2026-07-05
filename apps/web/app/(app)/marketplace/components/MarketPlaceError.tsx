"use client";

import { Box, Button, Heading, Icon, Text, VStack } from "@chakra-ui/react";

import { LuRefreshCcw, LuTriangleAlert } from "react-icons/lu";

type MarketplaceErrorProps = {
  onRetry?: () => void;
};

export function MarketplaceError({ onRetry }: MarketplaceErrorProps) {
  return (
    <Box
      py={24}
      px={6}
      borderWidth="1px"
      borderRadius="2xl"
      borderColor="border"
      bg="bg.panel"
    >
      <VStack gap={6}>
        <Box
          w="72px"
          h="72px"
          borderRadius="full"
          bg="red.subtle"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={LuTriangleAlert} boxSize={9} color="red.fg" />
        </Box>

        <VStack gap={2}>
          <Heading size="lg" color="text" textAlign="center">
            Unable to load auctions
          </Heading>

          <Text color="muted" textAlign="center" maxW="520px">
            We couldn't load the marketplace right now. Please check your
            connection and try again.
          </Text>
        </VStack>

        {onRetry && (
          <Button colorPalette="brand" onClick={onRetry}>
            <LuRefreshCcw />
            Try Again
          </Button>
        )}
      </VStack>
    </Box>
  );
}
