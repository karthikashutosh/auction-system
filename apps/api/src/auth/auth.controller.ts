import { FastifyReply, FastifyRequest } from "fastify";
import { loginService, signupService } from "./auth.service";
import { LoginDto, SignupDto } from "@repo/shared";

export async function signupController(
  request: FastifyRequest<{
    Body: SignupDto;
  }>,
  reply: FastifyReply
) {
  const user = await signupService(request.body);

  return reply.code(201).send(user);
}

export async function loginController(
  request: FastifyRequest<{ Body: LoginDto }>,
  reply: FastifyReply
) {
  const verifiedUser = await loginService(request.body);

  const token = request.server.jwt.sign({
    id: verifiedUser.id,
    email: verifiedUser.email,
  });

  reply.setCookie("accessToken", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return reply.code(200).send({
    success: true,
  });
}
