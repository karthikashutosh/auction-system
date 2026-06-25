"use client";

import { Badge, Box, Heading, Skeleton, Table, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetBidsByAuctionId } from "../../../hooks/useGetBidsByAuctionId";
import { BidItem } from "@repo/types";
import PaginatedLayout from "../../../components/ui/PaginatedLayout";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "green",
  CLOSED: "red",
  PENDING: "yellow",
};

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
  }).format(Number(value));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const COLUMNS = [
  "Title",
  "My Bid",
  "Current Price",
  "Status",
  "Ends At",
  "Bid Time",
];
const LIMIT = 10;

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: LIMIT }).map((_, i) => (
        <Table.Row key={i}>
          {COLUMNS.map((col) => (
            <Table.Cell key={col}>
              <Skeleton
                height="16px"
                width={col === "Title" ? "140px" : "80px"}
                borderRadius="md"
                bgColor="gray.300"
              />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </>
  );
}

function EmptyRow() {
  return (
    <Table.Row>
      <Table.Cell colSpan={COLUMNS.length} textAlign="center" py={10}>
        <Text color="gray.400" fontSize="sm">
          No bids found.
        </Text>
      </Table.Cell>
    </Table.Row>
  );
}

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const router = useRouter();

  const { data, isLoading, isFetching } = useGetBidsByAuctionId({
    limit: LIMIT,
    page,
  });

  const showSkeleton = isLoading || isFetching || data == undefined;

  const items: BidItem[] = data?.items ?? [];
  const pagination = data?.pagination;

  const handleRowClick = (id: string) => {
    router.push(`/auctions/${id}`);
  };

  const renderRows = () => {
    if (showSkeleton) return <SkeletonRows />;
    if (items.length === 0) return <EmptyRow />;

    return items.map((item, index) => (
      <Table.Row
        key={`${item.id}-${index}`}
        onClick={() => handleRowClick(item.id)}
        cursor="pointer"
        _hover={{ bg: "gray.200" }}
        transition="background 0.15s"
      >
        <Table.Cell>
          <Text fontWeight="medium" lineClamp={1} maxW="200px">
            {item.title}
          </Text>
        </Table.Cell>
        <Table.Cell fontWeight="semibold" color="blue.600">
          {formatCurrency(item.bid_amount)}
        </Table.Cell>
        <Table.Cell>{formatCurrency(item.current_price)}</Table.Cell>
        <Table.Cell>
          <Badge
            colorPalette={STATUS_COLORS[item.status] ?? "gray"}
            borderRadius="full"
            px={2}
            py={0.5}
          >
            {item.status}
          </Badge>
        </Table.Cell>
        <Table.Cell color="gray.600" fontSize="sm">
          {formatDate(item.end_time)}
        </Table.Cell>
        <Table.Cell color="gray.600" fontSize="sm">
          {formatDate(item.bid_time)}
        </Table.Cell>
      </Table.Row>
    ));
  };

  if (!pagination) return null;

  return (
    <PaginatedLayout
      currentPage={Number(pagination.page)}
      hasNextPage={pagination.hasNextPage}
      hasPreviousPage={pagination.hasPreviousPage}
      limit={LIMIT}
      onPageChange={setPage}
      totalItems={pagination.totalItems}
      totalPages={pagination.totalPages}
    >
      <Heading mb={6}>My Bids</Heading>
      <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
        <Table.Root size="md" variant="outline">
          <Table.Header bg="gray.50">
            <Table.Row>
              {COLUMNS.map((col) => (
                <Table.ColumnHeader key={col}>{col}</Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>

          <Table.Body>{renderRows()}</Table.Body>
        </Table.Root>
      </Box>
    </PaginatedLayout>
  );
}
