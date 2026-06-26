import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  notificationAllReadRespository,
  notificationReadRespository,
} from "@repo/db";
import {
  notificationsAllReadService,
  notificationsReadService,
} from "../notifications.service";

vi.mock("@repo/db", async () => {
  const actual = await vi.importActual<typeof import("@repo/db")>("@repo/db");

  return {
    ...actual,
    notificationReadRespository: vi.fn(),
    notificationAllReadRespository: vi.fn(),
  };
});

describe("notification.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notificationsReadService", () => {
    it("should mark notification as read", async () => {
      const response = {
        success: true,
      };

      vi.mocked(notificationReadRespository).mockResolvedValue(response as any);

      const result = await notificationsReadService({
        userId: "user-1",
        notificationId: "notification-1",
      });

      expect(notificationReadRespository).toHaveBeenCalledWith({
        userId: "user-1",
        notificationId: "notification-1",
      });

      expect(result).toEqual(response);
    });

    it("should propagate repository errors", async () => {
      vi.mocked(notificationReadRespository).mockRejectedValue(
        new Error("Database Error")
      );

      await expect(
        notificationsReadService({
          userId: "user-1",
          notificationId: "notification-1",
        })
      ).rejects.toThrow("Database Error");
    });
  });

  describe("notificationsAllReadService", () => {
    it("should mark all notifications as read", async () => {
      const response = {
        success: true,
      };

      vi.mocked(notificationAllReadRespository).mockResolvedValue(
        response as any
      );

      const result = await notificationsAllReadService("user-1");

      expect(notificationAllReadRespository).toHaveBeenCalledWith("user-1");

      expect(result).toEqual(response);
    });

    it("should propagate repository errors", async () => {
      vi.mocked(notificationAllReadRespository).mockRejectedValue(
        new Error("Database Error")
      );

      await expect(notificationsAllReadService("user-1")).rejects.toThrow(
        "Database Error"
      );
    });
  });
});
