import { FastifyReply, FastifyRequest } from "fastify";
import { findById } from "./user.repository";

type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export async function getMeController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as AuthUser;

  const updatedUser = await findById(user.id);

  reply.code(200).send({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
  });
}

export async function logoutController(_, reply: FastifyReply) {
  reply.clearCookie("accessToken", {
    path: "/",
  });
}
