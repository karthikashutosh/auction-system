import { FastifyReply, FastifyRequest } from "fastify";
import {
  googleOauthService,
  loginService,
  signupService,
} from "./auth.service";
import { GoogleOauthDto, LoginDto, SignupDto } from "@repo/shared";
import { createAuthSession, issueAccessToken } from "./auth.session";
import { AuthUser } from "@repo/types";

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
  const user = await loginService(request.body);

  createAuthSession({ id: user.id }, request, reply);

  return reply.code(200).send({
    success: true,
  });
}

export const googleOauthController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const validatedRequest = GoogleOauthDto.parse(request.body);

  const user = await googleOauthService(validatedRequest.token);

  createAuthSession({ id: user.id }, request, reply);

  return reply.code(200).send({
    success: true,
  });
};

export const refreshTokenController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const refreshToken = request.cookies.refreshToken;

  if (!refreshToken) {
    return reply.status(401).send({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const payload = request.server.jwt.verify<AuthUser>(refreshToken);

  issueAccessToken(payload, request, reply);

  return reply.code(200).send({
    success: true,
  });
};
