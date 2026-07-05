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
    it("should return items with next cursor when more items exist", async () => {
      const rows = [
        {
          id: "auction-1",
          start_time: "2026-07-04T16:00:00.000Z",
        },
        {
          id: "auction-2",
          start_time: "2026-07-04T15:00:00.000Z",
        },
        {
          id: "auction-3",
          start_time: "2026-07-04T14:00:00.000Z",
        },
      ];

      vi.mocked(getMyAuctionRepository).mockResolvedValue(rows as any);

      const result = await getMyAuctionService({
        id: "user-1",
        limit: 2,
        cursor: undefined,
      });

      expect(getMyAuctionRepository).toHaveBeenCalledWith({
        id: "user-1",
        limit: 3,
        cursor: undefined,
      });

      expect(result).toEqual({
        items: rows.slice(0, 2),
        pagination: {
          limit: 2,
          hasNextPage: true,
          nextCursor: {
            startTime: rows[1].start_time,
            id: rows[1].id,
          },
        },
      });
    });

    it("should return last page correctly", async () => {
      const rows = [
        {
          id: "auction-1",
          start_time: "2026-07-04T16:00:00.000Z",
        },
        {
          id: "auction-2",
          start_time: "2026-07-04T15:00:00.000Z",
        },
      ];

      vi.mocked(getMyAuctionRepository).mockResolvedValue(rows as any);

      const result = await getMyAuctionService({
        id: "user-1",
        limit: 2,
        cursor: undefined,
      });

      expect(result).toEqual({
        items: rows,
        pagination: {
          limit: 2,
          hasNextPage: false,
          nextCursor: null,
        },
      });
    });

    it("should forward cursor to repository", async () => {
      const cursor = {
        startTime: "2026-07-04T15:00:00.000Z",
        id: "auction-10",
      };

      vi.mocked(getMyAuctionRepository).mockResolvedValue([]);

      await getMyAuctionService({
        id: "user-1",
        limit: 10,
        cursor,
      });

      expect(getMyAuctionRepository).toHaveBeenCalledWith({
        id: "user-1",
        limit: 11,
        cursor,
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
