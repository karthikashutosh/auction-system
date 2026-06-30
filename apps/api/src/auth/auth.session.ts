import { AuthUser } from "@repo/types";
import { FastifyReply, FastifyRequest } from "fastify";

export const createAuthSession = (
  user: AuthUser,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const accessToken = request.server.jwt.sign(
    {
      id: user.id,
    },
    {
      expiresIn: "15m",
    },
  );

  const refreshToken = request.server.jwt.sign(
    {
      id: user.id,
    },
    {
      expiresIn: "30d",
    },
  );

  reply.setCookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  reply.setCookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    accessToken,
    refreshToken,
  };
};

export const issueAccessToken = (
  user: AuthUser,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const accessToken = request.server.jwt.sign(
    {
      id: user.id,
    },
    {
      expiresIn: "15m",
    },
  );

  reply.setCookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
};
