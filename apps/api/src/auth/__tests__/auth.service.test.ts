import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

import { createUser, findExistingUser } from "@repo/db";
import {
  googleOauthService,
  loginService,
  signupService,
} from "../auth.service";
import { BadRequestError, ConflictError, UnauthorizedError } from "@repo/types";
import { googleClient } from "../googleOauthClient";

vi.mock("@repo/db", () => ({
  createUser: vi.fn(),
  findExistingUser: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("./googleOauthClient", () => ({
  googleClient: {
    verifyIdToken: vi.fn(),
  },
}));

const mockUser = {
  id: "user-id",
  email: "john@example.com",
  password_hash: "hashed-password",
  name: "John",
  created_at: new Date(),
  updated_at: new Date(),
  role: "USER",
  provider: "local",
  provider_id: null,
  avatar_url: null,
};

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signupService", () => {
    it("should create a new user successfully", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue(
        "hashed-password" as unknown as void
      );
      vi.mocked(findExistingUser).mockResolvedValue(null);
      vi.mocked(createUser).mockResolvedValue(mockUser as any);

      const result = await signupService({
        name: "John",
        email: "john@example.com",
        password: "password123",
      });

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(findExistingUser).toHaveBeenCalledWith("john@example.com");
      expect(createUser).toHaveBeenCalledWith({
        name: "John",
        email: "john@example.com",
        passwordHash: "hashed-password",
        provider: "local",
        providerId: null,
        avatarUrl: null,
      });

      expect(result).toEqual({
        message: "User created successfully",
      });
    });

    it("should throw if google account already exists", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue(
        "hashed-password" as unknown as void
      );

      vi.mocked(findExistingUser).mockResolvedValue({
        ...mockUser,
        provider: "google",
      } as any);

      await expect(
        signupService({
          name: "John",
          email: "john@example.com",
          password: "password123",
        })
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should throw if local account already exists", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue(
        "hashed-password" as unknown as void
      );

      vi.mocked(findExistingUser).mockResolvedValue({
        ...mockUser,
        provider: "local",
      } as any);

      await expect(
        signupService({
          name: "John",
          email: "john@example.com",
          password: "password123",
        })
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("loginService", () => {
    it("should login successfully", async () => {
      vi.mocked(findExistingUser).mockResolvedValue(mockUser as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as unknown as void);

      const result = await loginService({
        email: "john@example.com",
        password: "password123",
      });

      expect(findExistingUser).toHaveBeenCalledWith("john@example.com");
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashed-password"
      );
      expect(result).toEqual(mockUser);
    });

    it("should throw if user does not exist", async () => {
      vi.mocked(findExistingUser).mockResolvedValue(null);

      await expect(
        loginService({
          email: "john@example.com",
          password: "password123",
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("should throw if account is google provider", async () => {
      vi.mocked(findExistingUser).mockResolvedValue({
        ...mockUser,
        provider: "google",
      } as any);

      await expect(
        loginService({
          email: "john@example.com",
          password: "password123",
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("should throw if password is incorrect", async () => {
      vi.mocked(findExistingUser).mockResolvedValue(mockUser as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as unknown as void);

      await expect(
        loginService({
          email: "john@example.com",
          password: "password123",
        })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("googleOauthService", () => {
    it("should return existing google user", async () => {
      vi.spyOn(googleClient, "verifyIdToken").mockResolvedValue({
        getPayload: () => ({
          email: "john@example.com",
          sub: "google-id",
          picture: "avatar.png",
          name: "John",
        }),
      } as any);

      vi.mocked(findExistingUser).mockResolvedValue(mockUser as any);

      const result = await googleOauthService("token");

      expect(result).toEqual(mockUser);
      expect(createUser).not.toHaveBeenCalled();
    });

    it("should create a new google user", async () => {
      vi.spyOn(googleClient, "verifyIdToken").mockResolvedValue({
        getPayload: () => ({
          email: "john@example.com",
          sub: "google-id",
          picture: "avatar.png",
          name: "John",
        }),
      } as any);

      vi.mocked(findExistingUser).mockResolvedValue(null);
      vi.mocked(createUser).mockResolvedValue({
        ...mockUser,
        provider: "google",
      } as any);

      const result = await googleOauthService("token");

      expect(createUser).toHaveBeenCalledWith({
        email: "john@example.com",
        name: "John",
        passwordHash: null,
        provider: "google",
        providerId: "google-id",
        avatarUrl: "avatar.png",
      });

      expect(result.provider).toBe("google");
    });

    it("should throw if email is missing", async () => {
      vi.spyOn(googleClient, "verifyIdToken").mockResolvedValue({
        getPayload: () => ({
          sub: "google-id",
        }),
      } as any);

      await expect(googleOauthService("token")).rejects.toBeInstanceOf(
        BadRequestError
      );
    });

    it("should throw if sub is missing", async () => {
      vi.spyOn(googleClient, "verifyIdToken").mockResolvedValue({
        getPayload: () => ({
          email: "john@example.com",
        }),
      } as any);

      await expect(googleOauthService("token")).rejects.toBeInstanceOf(
        BadRequestError
      );
    });
  });
});
