import { FastifyReply, FastifyRequest } from "fastify";
import { preSignedUploadService } from "./uploads.service";
import { AuthUser } from "../user/user.controller";

interface GetPresignedUrlPayload {
  fileName: string;
  contentType: string;
}

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
