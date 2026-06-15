import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const createAuctionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .min(20, "Description must be at least 20 characters")
      .max(2000, "Description cannot exceed 2000 characters"),

    startingPrice: z.coerce
      .number()
      .gt(0, "Starting price must be greater than 0"),

    reservePrice: z.coerce
      .number()
      .gt(0, "Reserve price must be greater than 0"),

    endDate: z.string().min(1, "Auction end date is required"),

    image: z
      .instanceof(File, {
        error: "Auction image is required",
      })
      .refine(
        (file) =>
          ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
            file.type
          ),
        {
          message: "Only JPG, PNG and WEBP images are allowed",
        }
      )
      .refine((file) => file.size <= MAX_FILE_SIZE, {
        message: "Image size must be less than 5MB",
      }),
  })
  .refine((data) => data.reservePrice >= data.startingPrice, {
    path: ["reservePrice"],
    message: "Reserve price must be greater than or equal to starting price",
  })
  .refine(
    (data) => {
      const selectedDate = new Date(data.endDate);
      return selectedDate > new Date();
    },
    {
      path: ["endDate"],
      message: "Auction end date must be in the future",
    }
  );

export type CreateAuctionFormData = z.infer<typeof createAuctionSchema>;
export type CreateAuctionFormInput = z.input<typeof createAuctionSchema>;

export type CreateAuctionFormOutput = z.output<typeof createAuctionSchema>;
