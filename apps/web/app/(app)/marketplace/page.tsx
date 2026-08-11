"use client";

import { Box, Container, Spinner, VStack } from "@chakra-ui/react";
import { useRef } from "react";

import { useGetAuctions } from "../../../hooks/useGetAllAuctions";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";
import { useLogout } from "../../../hooks/userLogout";
import { useAuthStore } from "../../../store/auth.store";
import { MarketplaceContent } from "./components/MarketPlaceContent";
import { MarketplaceFilters } from "./components/MarketPlaceFilters";
import { MarketplaceHeader } from "./components/MarketPlaceHeader";

export default function MarketplacePage() {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((state) => state.user);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetAuctions(10);

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  useIntersectionObserver({
    target: loadMoreRef,
    enabled: hasNextPage && !isFetchingNextPage,
    onIntersect: fetchNextPage,
  });

  return (
    <Container maxW="7xl" py={8}>
      <VStack align="stretch" gap={8}>
        <Box
          position="sticky"
          top={0}
          zIndex={100}
          bg="white"
          p={4}
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <MarketplaceHeader user={user} />
          {/* {!isError && <MarketplaceFilters />} */}
        </Box>

        <MarketplaceContent
          isLoading={isLoading}
          isError={isError}
          items={items}
        />

        {hasNextPage && <Box ref={loadMoreRef} h="1px" />}
        {isFetchingNextPage && (
          <Box textAlign="center" py={4}>
            <Spinner title="Loading More Auctions" />
          </Box>
        )}
      </VStack>
    </Container>
  );
}
