"use client";

import { Box, Button, Card, Skeleton, Text, VStack } from "@chakra-ui/react";
import { useValuation } from "../../../hooks/useValuation";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const FALLBACK: Record<string, string> = {
  no_comparables:
    "We couldn't find similar sold listings yet, so there's no price guidance for this item.",
  insufficient_data:
    "There are too few similar sold listings to suggest a reliable range.",
  single_seller:
    "Similar sales all came from one seller, so we can't give a fair range.",
};

type Props = {
  title: string;
  description: string;
  onUseSuggestion: (price: number) => void;
};

export function PriceGuidance({ title, description, onUseSuggestion }: Props) {
  const t = useDebouncedValue(title ?? "", 600);
  const d = useDebouncedValue(description ?? "", 600);
  const { data, isFetching, isError } = useValuation(t, d);

  if (!t || !d || (!data && !isFetching && !isError)) return null;

  return (
    <Card.Root bg="surface" borderWidth="1px" borderColor="border" data-testid="price-guidance">
      <Card.Body>
        <VStack align="stretch" gap={3}>
          <Text color="muted" fontSize="sm" textTransform="uppercase">
            Price guidance
          </Text>

          {isFetching && !data && <Skeleton h="60px" />}

          {isError && (
            <Text color="muted" fontSize="sm">
              Price guidance is unavailable right now. You can still create your listing.
            </Text>
          )}

          {data && data.status === "ok" && data.median !== null && (
            <>
              <Box>
                <Text fontSize="sm" color="muted">
                  Typical sold price
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {inr(data.median)}
                </Text>
                <Text fontSize="sm" color="muted">
                  Usually {inr(data.p25 ?? data.median)} – {inr(data.p75 ?? data.median)} ({data.n} similar sales)
                </Text>
              </Box>
              {data.explanation && <Text fontSize="sm">{data.explanation}</Text>}
              {data.suggested_starting_price !== null && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUseSuggestion(data.suggested_starting_price as number)}
                >
                  Use suggested starting price {inr(data.suggested_starting_price)}
                </Button>
              )}
            </>
          )}

          {data && data.status !== "ok" && (
            <Text fontSize="sm" color="muted">
              {FALLBACK[data.status]}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
