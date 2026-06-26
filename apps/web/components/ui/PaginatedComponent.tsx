// components/layout/PaginatedPage.tsx

import { Box, Flex } from "@chakra-ui/react";
import PaginationComponent from "../../app/components/Auction/pagination";

type Props = {
  children: React.ReactNode;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
};

export function PaginatedPage({
  children,
  currentPage,
  totalPages,
  totalItems,
  limit,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
}: Props) {
  return (
    <Flex direction="column" minH="calc(100vh - 40px)" padding={4}>
      <Box flex="1">{children}</Box>

      <PaginationComponent
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        limit={limit}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPageChange={onPageChange}
      />
    </Flex>
  );
}
