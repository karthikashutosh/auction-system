"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Input, Text, VStack } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  amount: z.coerce.number().positive("Bid amount must be greater than 0"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  currentPrice: string;
  disabled?: boolean;
  onSubmit?: (amount: number) => Promise<void>;
};

export function BidForm({ currentPrice, disabled = false, onSubmit }: Props) {
  const minimumBid = Number(currentPrice) + 100;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // resolver: zodResolver(schema),
  });

  const submit = async (values: FormValues) => {
    if (values.amount < minimumBid) {
      return;
    }

    await onSubmit?.(values.amount);
  };

  return (
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
            {...register("amount")}
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
            size="lg"
            colorPalette="blue"
            loading={isSubmitting}
            disabled={disabled}
            // onClick={handleSubmit(submit)}
          >
            {disabled ? "You Own This Auction" : "Place Bid"}
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
