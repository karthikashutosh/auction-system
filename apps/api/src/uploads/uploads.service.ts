import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config";
import { BadRequestError, GetPresignedUrlPayload } from "@repo/types";

interface PreSignedUploadType extends GetPresignedUrlPayload {
  userId: string;
}

export const preSignedUploadService = async (data: PreSignedUploadType) => {
  const { fileName, contentType, userId } = data;

  const key = `users/${userId}/${fileName}`;

  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

  if (!ALLOWED_TYPES.has(contentType)) {
    throw new BadRequestError("Unsupported file type", "INVALID_CONTENT_TYPE");
  }

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 5,
  });

  return {
    uploadUrl,
    key,
  };
};
