import {
  addAuction,
  db,
  getAuctionById,
  getAuctionCount,
  getAuctions,
  getValidAuctionById,
  placeNewBid,
  updateAuctionRepository,
} from "@repo/db";
import { auctionQueue } from "@repo/queue";
import { publish } from "@repo/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSignedImageUrl } from "../../config";
import {
  createAuctionService,
  getAllAuctionsService,
  getAuctionByIdService,
  placeBidService,
} from "../auctions.service";

vi.mock("@repo/db", async () => {
  const actual = await vi.importActual<typeof import("@repo/db")>("@repo/db");

  return {
    ...actual,

    addAuction: vi.fn(),
    getAuctionCount: vi.fn(),
    getAuctions: vi.fn(),
    getAuctionById: vi.fn(),
    getValidAuctionById: vi.fn(),
    placeNewBid: vi.fn(),
    updateAuctionRepository: vi.fn(),
    getBidsHistoryRepository: vi.fn(),
    getCountBidsHistory: vi.fn(),

    db: {
      connect: vi.fn(),
    },
  };
});

vi.mock("@repo/queue", () => ({
  auctionQueue: {
    add: vi.fn(),
  },
}));

vi.mock("../../config", () => ({
  getSignedImageUrl: vi.fn(),
}));

vi.mock("@repo/redis", async () => {
  const actual =
    await vi.importActual<typeof import("@repo/redis")>("@repo/redis");

  return {
    ...actual,
    publish: vi.fn(),
  };
});

const mockAuction = {
  id: "auction-1",
};

describe("auction.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAuctionService", () => {
    it("should create auction successfully", async () => {
      vi.mocked(addAuction).mockResolvedValue(mockAuction as any);

      const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const result = await createAuctionService("user-1", {
        title: "Macbook Pro",
        description: "Apple Laptop",
        imageKey: "users/user-1/macbook.png",
        startingPrice: 50000,
        reservePrice: 60000,
        endDate,
      });

      expect(addAuction).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "user-1",
          title: "Macbook Pro",
          description: "Apple Laptop",
          imageKey: "users/user-1/macbook.png",
          startingPrice: 50000,
          currentPrice: 50000,
          reservePrice: 60000,
        })
      );

      expect(auctionQueue.add).toHaveBeenCalledWith(
        "auction-expiry",
        {
          auctionId: "auction-1",
        },
        expect.objectContaining({
          jobId: "auction-expiry-auction-1",
        })
      );

      expect(result).toEqual({
        id: "auction-1",
        message: "Auction created successfully",
      });
    });

    it("should throw when image does not belong to user", async () => {
      await expect(
        createAuctionService("user-1", {
          title: "Macbook",
          description: "Apple",
          imageKey: "users/user-2/macbook.png",
          startingPrice: 50000,
          reservePrice: 60000,
          endDate: new Date().toISOString(),
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "IMAGE_ACCESS_DENIED",
        message: "Image does not belong to user",
      });

      expect(addAuction).not.toHaveBeenCalled();
      expect(auctionQueue.add).not.toHaveBeenCalled();
    });
  });
  describe("getAllAuctionsService", () => {
    it("should return paginated auctions", async () => {
      const mockAuctions = [
        {
          id: "auction-1",
          title: "MacBook Pro",
        },
        {
          id: "auction-2",
          title: "iPhone",
        },
      ];

      vi.mocked(getAuctionCount).mockResolvedValue(25);
      vi.mocked(getAuctions).mockResolvedValue(mockAuctions as any);

      const result = await getAllAuctionsService({
        page: 2,
        limit: 10,
      });

      expect(getAuctionCount).toHaveBeenCalled();

      expect(getAuctions).toHaveBeenCalledWith({
        limit: 10,
        offset: 10,
      });

      expect(result).toEqual({
        items: mockAuctions,
        pagination: {
          page: 2,
          limit: 10,
          totalItems: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
    });

    it("should return first page correctly", async () => {
      vi.mocked(getAuctionCount).mockResolvedValue(5);

      vi.mocked(getAuctions).mockResolvedValue([
        {
          id: "auction-1",
        },
      ] as any);

      const result = await getAllAuctionsService({
        page: 1,
        limit: 10,
      });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        totalItems: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it("should calculate offset correctly", async () => {
      vi.mocked(getAuctionCount).mockResolvedValue(100);
      vi.mocked(getAuctions).mockResolvedValue([]);

      await getAllAuctionsService({
        page: 5,
        limit: 20,
      });

      expect(getAuctions).toHaveBeenCalledWith({
        limit: 20,
        offset: 80,
      });
    });
  });
  describe("getAuctionByIdService", () => {
    it("should return auction details with signed image url", async () => {
      vi.mocked(getAuctionById).mockResolvedValue({
        id: "auction-1",
        title: "Macbook Pro",
        image_key: "users/user-1/macbook.png",
        starting_price: "1000",
        current_price: "1500",
        reserve_price: "2000",
        total_bids: "5",
        participated_users: "3",
      } as any);

      vi.mocked(getSignedImageUrl).mockResolvedValue(
        "https://signed-url.com/image.png"
      );

      const result = await getAuctionByIdService({
        auctionId: "auction-1",
        userId: "user-1",
      });

      expect(getAuctionById).toHaveBeenCalledWith({
        auctionId: "auction-1",
        userId: "user-1",
      });

      expect(getSignedImageUrl).toHaveBeenCalledWith(
        "users/user-1/macbook.png"
      );

      expect(result).toEqual({
        id: "auction-1",
        title: "Macbook Pro",
        image_key: "users/user-1/macbook.png",
        imageUrl: "https://signed-url.com/image.png",
        starting_price: 1000,
        current_price: 1500,
        reserve_price: 2000,
        total_bids: 5,
        participated_users: 3,
      });
    });

    it("should convert numeric values to numbers", async () => {
      vi.mocked(getAuctionById).mockResolvedValue({
        image_key: "image.png",
        starting_price: "500",
        current_price: "700",
        reserve_price: "900",
        total_bids: "10",
        participated_users: "6",
      } as any);

      vi.mocked(getSignedImageUrl).mockResolvedValue("signed-url");

      const result = await getAuctionByIdService({
        auctionId: "auction-1",
        userId: "user-1",
      });

      expect(typeof result.starting_price).toBe("number");
      expect(typeof result.current_price).toBe("number");
      expect(typeof result.reserve_price).toBe("number");
      expect(typeof result.total_bids).toBe("number");
      expect(typeof result.participated_users).toBe("number");
    });
  });
  describe("placeBidService", () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    const mockAuction = {
      id: "auction-1",
      sellerId: "seller-1",
      current_price: 1000,
      status: "ACTIVE",
      endTime: new Date(Date.now() + 60 * 60 * 1000),
    };

    const mockBid = {
      id: "bid-1",
      amount: 1200,
      userId: "buyer-1",
    };

    beforeEach(() => {
      vi.mocked(db.connect).mockResolvedValue(mockClient as any);

      mockClient.query.mockResolvedValue(undefined);

      vi.mocked(getValidAuctionById).mockResolvedValue(mockAuction as any);

      vi.mocked(placeNewBid).mockResolvedValue(mockBid as any);

      vi.mocked(updateAuctionRepository).mockResolvedValue(undefined as any);

      vi.mocked(publish).mockResolvedValue(undefined as any);
    });

    it("should place bid successfully", async () => {
      const result = await placeBidService({
        auctionId: "auction-1",
        bidAmount: 1200,
        userId: "buyer-1",
        userName: "John",
      });

      expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");

      expect(placeNewBid).toHaveBeenCalled();

      expect(updateAuctionRepository).toHaveBeenCalled();

      expect(mockClient.query).toHaveBeenNthCalledWith(2, "COMMIT");

      expect(publish).toHaveBeenCalledWith(
        "auction-events",
        expect.objectContaining({
          auctionId: "auction-1",
        })
      );

      expect(mockClient.release).toHaveBeenCalled();

      expect(result).toEqual({
        id: "bid-1",
        bidAmount: 1200,
        userId: "buyer-1",
      });
    });

    it("should rollback transaction when bid fails", async () => {
      vi.mocked(placeNewBid).mockRejectedValue(new Error("Database failure"));

      await expect(
        placeBidService({
          auctionId: "auction-1",
          bidAmount: 1200,
          userId: "buyer-1",
          userName: "John",
        })
      ).rejects.toThrow("Database failure");

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");

      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should throw when auction is not found", async () => {
      vi.mocked(getValidAuctionById).mockResolvedValue(null as any);

      await expect(
        placeBidService({
          auctionId: "auction-1",
          bidAmount: 1200,
          userId: "buyer-1",
          userName: "John",
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "AUCTION_NOT_FOUND",
        message: "Auction not found",
      });

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });

    it("should throw when auction is not active", async () => {
      vi.mocked(getValidAuctionById).mockResolvedValue({
        ...mockAuction,
        status: "ENDED",
      } as any);

      await expect(
        placeBidService({
          auctionId: "auction-1",
          bidAmount: 1200,
          userId: "buyer-1",
          userName: "John",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "AUCTION_ENDED",
        message: "Auction ended",
      });

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });

    it("should throw when bid amount is too low", async () => {
      vi.mocked(getValidAuctionById).mockResolvedValue({
        ...mockAuction,
        current_price: 1000,
      } as any);

      await expect(
        placeBidService({
          auctionId: "auction-1",
          bidAmount: 1050,
          userId: "buyer-1",
          userName: "John",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "BID_AMOUNT_TOO_LOW",
        message: "Bid amount must be at least ₹100 higher than the current bid",
      });

      expect(placeNewBid).not.toHaveBeenCalled();
    });

    it("should throw when seller tries to bid", async () => {
      vi.mocked(getValidAuctionById).mockResolvedValue({
        ...mockAuction,
        sellerId: "buyer-1",
      } as any);

      await expect(
        placeBidService({
          auctionId: "auction-1",
          bidAmount: 1200,
          userId: "buyer-1",
          userName: "John",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "SELF_BIDDING_NOT_ALLOWED",
        message: "You cannot bid on your own auction",
      });

      expect(placeNewBid).not.toHaveBeenCalled();
    });

    it("should throw when auction has already expired", async () => {
      vi.mocked(getValidAuctionById).mockResolvedValue({
        ...mockAuction,
        endTime: new Date(Date.now() - 1000),
      } as any);

      await expect(
        placeBidService({
          auctionId: "auction-1",
          bidAmount: 1200,
          userId: "buyer-1",
          userName: "John",
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "AUCTION_ENDED",
        message: "Auction has ended",
      });

      expect(placeNewBid).not.toHaveBeenCalled();
    });
  });
});
