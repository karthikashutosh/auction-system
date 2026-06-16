import { FastifyReply, FastifyRequest } from "fastify";
import { findById } from "./user.repository";
import { getMe } from "./user.service";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function getMeController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;

  const result = await getMe(user.id);

  reply.code(200).send(result);
}

export async function logoutController(_, reply: FastifyReply) {
  reply.clearCookie("accessToken", {
    path: "/",
  });
}
