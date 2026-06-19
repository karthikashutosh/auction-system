"use client";

import { Button, HStack, Input, Text } from "@chakra-ui/react";
import { useState, useRef } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
}

export default function PaginationComponent({
  currentPage,
  totalPages,
  totalItems,
  limit,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
}: PaginationProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const rangeStart = (currentPage - 1) * limit + 1;
  const rangeEnd = Math.min(currentPage * limit, totalItems);

  const handlePageJump = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handlePageJump();
  };

  return (
    <HStack
      justify="space-between"
      mt={4}
      align="center"
      flexWrap="wrap"
      gap={3}
    >
      {/* Range info */}
      <Text fontSize="sm" color="gray.500">
        Showing{" "}
        <Text as="span" fontWeight="semibold" color="gray.700">
          {rangeStart}–{rangeEnd}
        </Text>{" "}
        of{" "}
        <Text as="span" fontWeight="semibold" color="gray.700">
          {totalItems}
        </Text>{" "}
        results
      </Text>

      <HStack>
        {/* Previous */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
        >
          Previous
        </Button>

        {/* Current page indicator */}
        <Text fontSize="sm" color="gray.600" px={1} whiteSpace="nowrap">
          Page {currentPage} of {totalPages}
        </Text>

        {/* Next */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
        >
          Next
        </Button>

        {/* Jump to page */}
        <HStack>
          <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
            Go to
          </Text>
          <Input
            ref={inputRef}
            size="sm"
            w="60px"
            textAlign="center"
            placeholder={String(currentPage)}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            type="number"
            min={1}
            max={totalPages}
          />
          <Button size="sm" variant="solid" onClick={handlePageJump}>
            Go
          </Button>
        </HStack>
      </HStack>
    </HStack>
  );
}
