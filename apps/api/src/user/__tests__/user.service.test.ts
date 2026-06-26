import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMe,
  getMyAuctionService,
  getAllNotificationsRepository,
} from "../user.service";

import {
  db,
  findById,
  getMyAuctionCount,
  getMyAuctionRepository,
} from "@repo/db";

vi.mock("@repo/db", async () => {
  const actual = await vi.importActual<typeof import("@repo/db")>("@repo/db");

  return {
    ...actual,
    findById: vi.fn(),
    getMyAuctionCount: vi.fn(),
    getMyAuctionRepository: vi.fn(),
    db: {
      connect: vi.fn(),
    },
  };
});

describe("user.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMe", () => {
    it("should return user profile", async () => {
      vi.mocked(findById).mockResolvedValue({
        id: "user-1",
        email: "john@example.com",
        name: "John",
        avatar_url: "avatar.png",
        role: "USER",
      } as any);

      const result = await getMe("user-1");

      expect(findById).toHaveBeenCalledWith("user-1");

      expect(result).toEqual({
        id: "user-1",
        email: "john@example.com",
        name: "John",
        avatar_url: "avatar.png",
        role: "USER",
      });
    });
  });

  describe("getMyAuctionService", () => {
    it("should return paginated auctions", async () => {
      vi.mocked(getMyAuctionCount).mockResolvedValue(25);

      vi.mocked(getMyAuctionRepository).mockResolvedValue([
        {
          id: "auction-1",
          title: "MacBook",
        },
      ] as any);

      const result = await getMyAuctionService({
        id: "user-1",
        page: 2,
        limit: 10,
      });

      expect(getMyAuctionCount).toHaveBeenCalledWith("user-1");

      expect(getMyAuctionRepository).toHaveBeenCalledWith({
        id: "user-1",
        limit: 10,
        offset: 10,
      });

      expect(result).toEqual({
        items: [
          {
            id: "auction-1",
            title: "MacBook",
          },
        ],
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
      vi.mocked(getMyAuctionCount).mockResolvedValue(5);

      vi.mocked(getMyAuctionRepository).mockResolvedValue([] as any);

      const result = await getMyAuctionService({
        id: "user-1",
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
      vi.mocked(getMyAuctionCount).mockResolvedValue(100);

      vi.mocked(getMyAuctionRepository).mockResolvedValue([] as any);

      await getMyAuctionService({
        id: "user-1",
        page: 5,
        limit: 20,
      });

      expect(getMyAuctionRepository).toHaveBeenCalledWith({
        id: "user-1",
        limit: 20,
        offset: 80,
      });
    });
  });

  describe("getAllNotificationsRepository", () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    beforeEach(() => {
      vi.mocked(db.connect).mockResolvedValue(mockClient as any);
    });

    it("should return notifications", async () => {
      const notifications = [
        {
          id: "1",
          title: "New Bid",
        },
      ];

      mockClient.query.mockResolvedValue({
        rows: notifications,
      });

      const result = await getAllNotificationsRepository("user-1");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT *"),
        ["user-1"]
      );

      expect(result).toEqual(notifications);

      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should release client when query fails", async () => {
      mockClient.query.mockRejectedValue(new Error("Database Error"));

      await expect(getAllNotificationsRepository("user-1")).rejects.toThrow(
        "Database Error"
      );

      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
