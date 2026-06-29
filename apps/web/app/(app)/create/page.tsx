"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { FileUpload } from "../../components/ui/file-upload";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  HStack,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { CreateAuctionFormData, createAuctionSchema } from "@repo/shared";
import { uploadFileToS3 } from "../../../api/axios";
import { useCreateAuction } from "../../../hooks/useCreateAuction";
import { useGetPresignedUrl } from "../../../hooks/useGetPresignedUrl";

export default function CreateAuctionPage() {
  const [imagePreview, setImagePreview] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAuctionMutation = useCreateAuction();
  const getPresignedUrlMutation = useGetPresignedUrl();
  const router = useRouter();

  const {
    control,
    register,
    watch,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<
    z.input<typeof createAuctionSchema>,
    unknown,
    z.output<typeof createAuctionSchema>
  >({
    resolver: zodResolver(createAuctionSchema),
  });

  const title = watch("title");
  const description = watch("description");
  const startingPrice = watch("startingPrice");
  const image = watch("image");

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(image);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const onSubmit = async (data: CreateAuctionFormData) => {
    try {
      setIsSubmitting(true);

      const file = data.image;

      if (!file) {
        throw new Error("Image is required");
      }

      // 1. Get Presigned URL
      const presigned = await getPresignedUrlMutation.mutateAsync({
        fileName: file.name,
        contentType: file.type,
      });

      // // 2. Upload To S3
      await uploadFileToS3(presigned.uploadUrl, file);

      // 3. Create Auction
      await createAuctionMutation.mutateAsync({
        title: data.title,
        description: data.description,
        startingPrice: data.startingPrice,
        reservePrice: data.reservePrice,
        endDate: new Date(data.endDate).toISOString(),
        imageKey: presigned.key,
      });

      router.push("/");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box bg="bg" minH="100vh">
      <Container maxW="5xl" py={8}>
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading color="text">Create Auction</Heading>

            <Text color="muted">Publish a new auction to the marketplace</Text>
          </Box>

          <Button asChild variant="outline">
            <NextLink href="/">Back to Marketplace</NextLink>
          </Button>
        </Flex>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Flex
            direction={{
              base: "column",
              lg: "row",
            }}
            gap={6}
          >
            <Card.Root
              flex={1}
              bg="surface"
              borderWidth="1px"
              borderColor="border"
            >
              <Card.Body>
                <VStack align="stretch" gap={5}>
                  <Box>
                    <Text mb={2}>Auction Title</Text>

                    <Input
                      data-testid="auction-title-input"
                      placeholder="MacBook Pro M4"
                      {...register("title")}
                    />

                    {errors.title && (
                      <Text mt={1} color="red.500" fontSize="sm">
                        {errors.title.message}
                      </Text>
                    )}
                  </Box>

                  <Box>
                    <Text mb={2}>Description</Text>

                    <Textarea
                      data-testid="auction-description-input"
                      minH="140px"
                      placeholder="Describe your item..."
                      {...register("description")}
                    />

                    {errors.description && (
                      <Text mt={1} color="red.500" fontSize="sm">
                        {errors.description.message}
                      </Text>
                    )}
                  </Box>

                  <Box>
                    <Text mb={2}>Starting Price</Text>

                    <Input
                      data-testid="auction-starting-price-input"
                      type="number"
                      placeholder="100000"
                      {...register("startingPrice")}
                    />

                    {errors.startingPrice && (
                      <Text mt={1} color="red.500" fontSize="sm">
                        {errors.startingPrice.message}
                      </Text>
                    )}
                  </Box>

                  <Box>
                    <Text mb={2}>Reserve Price</Text>
                    <Input
                      data-testid="auction-reserve-price-input"
                      type="number"
                      placeholder="150000"
                      {...register("reservePrice")}
                    />

                    {errors.reservePrice && (
                      <Text mt={1} color="red.500" fontSize="sm">
                        {errors.reservePrice.message}
                      </Text>
                    )}
                  </Box>

                  <Box>
                    <Text mb={2}>Auction End Date</Text>

                    <Input
                      data-testid="auction-end-date-input"
                      type="datetime-local"
                      {...register("endDate")}
                    />

                    {errors.endDate && (
                      <Text mt={1} color="red.500" fontSize="sm">
                        {errors.endDate.message}
                      </Text>
                    )}
                  </Box>

                  <Box>
                    <Text mb={2}>Auction Image</Text>

                    <Controller
                      name="image"
                      control={control}
                      render={({ field, fieldState }) => (
                        <FileUpload
                          file={field.value}
                          error={fieldState.error?.message}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Box>

                  <Button
                    data-testid="create-auction-submit-button"
                    loading={isSubmitting}
                    type="submit"
                    size="lg"
                    colorPalette="blue"
                  >
                    Create Auction
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>

            <Card.Root
              w={{
                base: "100%",
                lg: "380px",
              }}
              bg="surface"
              borderWidth="1px"
              borderColor="border"
            >
              <Card.Body>
                <VStack align="stretch" gap={4}>
                  <Text color="muted" fontSize="sm" textTransform="uppercase">
                    Preview
                  </Text>

                  <Box
                    h="250px"
                    borderRadius="xl"
                    overflow="hidden"
                    border="1px solid"
                    borderColor="border"
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                          display: "block",
                        }}
                      />
                    ) : (
                      <Box h="100%" bg="blackAlpha.300" />
                    )}
                  </Box>

                  <Heading size="md">{title || "Auction Title"}</Heading>

                  <Text color="muted">
                    {description || "Auction description"}
                  </Text>

                  <HStack>
                    <Badge colorPalette="purple">New</Badge>

                    <Badge colorPalette="green">Active</Badge>
                  </HStack>

                  <Box>
                    <Text color="muted">Starting Price</Text>

                    <Heading size="lg" color="blue.500">
                      ₹
                      {startingPrice
                        ? Number(startingPrice).toLocaleString()
                        : "0"}
                    </Heading>
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>
          </Flex>
        </form>
      </Container>
    </Box>
  );
}
