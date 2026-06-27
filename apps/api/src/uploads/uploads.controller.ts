import { AuthUser, GetPresignedUrlPayload } from "@repo/types";
import { FastifyReply, FastifyRequest } from "fastify";
import { preSignedUploadService } from "./uploads.service";

export const uploadsController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const body = request.body as GetPresignedUrlPayload;
  const user = request.user as AuthUser;

  const result = await preSignedUploadService({
    userId: user.id,
    ...body,
  });

  return reply.code(200).send(result);
};
