"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Input, Text, VStack } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useParams } from "next/navigation";
import { bidSchema, type BidFormValues } from "@repo/shared";
import { usePlaceBid } from "../../../hooks/usePlaceBid";

type Props = {
  currentPrice: string;
  disabled?: boolean;
};

export function BidForm({ currentPrice, disabled = false }: Props) {
  const minimumBid = Number(currentPrice) + 100;
  const params = useParams();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
  });

  const auctionId = params.id as string;

  const { mutateAsync } = usePlaceBid();

  const submit = async (values: BidFormValues) => {
    if (values.amount < minimumBid) {
      setError("amount", {
        type: "manual",
        message: `Minimum bid amount is ₹${minimumBid}`,
      });

      return;
    }

    await mutateAsync({ auctionId, payload: { bidAmount: values.amount } });
  };

  return (
    <form onSubmit={handleSubmit(submit)}>
      <Card.Root>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            <Text fontWeight="semibold" fontSize="lg">
              Place Your Bid
            </Text>

            <Input
              type="number"
              size="lg"
              placeholder={`Minimum ₹${minimumBid.toLocaleString()}`}
              {...register("amount", { valueAsNumber: true })}
            />

            {errors.amount && (
              <Text color="red.500" fontSize="sm">
                {errors.amount.message}
              </Text>
            )}

            <Text color="fg.muted" fontSize="sm">
              Minimum next bid: ₹{minimumBid.toLocaleString()}
            </Text>

            <Button
              type="submit"
              size="lg"
              colorPalette="blue"
              loading={isSubmitting}
              disabled={disabled}
            >
              {disabled ? "You Own This Auction" : "Place Bid"}
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    </form>
  );
}
