import { beforeEach, describe, expect, it, vi } from "vitest";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { preSignedUploadService } from "../uploads.service";
import { s3Client } from "../../config";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock("../config", () => ({
  s3Client: {},
}));

describe("upload.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_BUCKET_NAME = "auction-bucket";
  });

  describe("preSignedUploadService", () => {
    it("should generate pre-signed upload url", async () => {
      vi.mocked(getSignedUrl).mockResolvedValue(
        "https://signed-upload-url.com"
      );

      const result = await preSignedUploadService({
        fileName: "image.png",
        contentType: "image/png",
        userId: "user-1",
      });

      expect(getSignedUrl).toHaveBeenCalledTimes(1);

      const [client, command, options] = vi.mocked(getSignedUrl).mock.calls[0];

      expect(client).toBe(s3Client);

      expect(command).toBeInstanceOf(PutObjectCommand);

      expect(options).toEqual({
        expiresIn: 60 * 5,
      });

      expect(result).toEqual({
        uploadUrl: "https://signed-upload-url.com",
        key: "users/user-1/image.png",
      });
    });

    it("should generate correct key", async () => {
      vi.mocked(getSignedUrl).mockResolvedValue("signed-url");

      const result = await preSignedUploadService({
        fileName: "photo.jpg",
        contentType: "image/jpeg",
        userId: "abc123",
      });

      expect(result.key).toBe("users/abc123/photo.jpg");
    });

    it("should call getSignedUrl once", async () => {
      vi.mocked(getSignedUrl).mockResolvedValue("signed-url");

      await preSignedUploadService({
        fileName: "avatar.png",
        contentType: "image/png",
        userId: "user-100",
      });

      expect(getSignedUrl).toHaveBeenCalledOnce();
    });
  });
});
