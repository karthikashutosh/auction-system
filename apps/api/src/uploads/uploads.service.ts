import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config";
import { GetPresignedUrlPayload } from "@repo/types";

interface PreSignedUploadType extends GetPresignedUrlPayload {
  userId: string;
}

export const preSignedUploadService = async (data: PreSignedUploadType) => {
  const { fileName, contentType, userId } = data;

  const key = `users/${userId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 5, // 5 minutes
  });

  return {
    uploadUrl,
    key,
  };
};
