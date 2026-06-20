import { FastifyReply, FastifyRequest } from "fastify";

type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export const createAuthSession = (
  user: AuthUser,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const accessToken = request.server.jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    {
      expiresIn: "15m",
    }
  );

  const refreshToken = request.server.jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    {
      expiresIn: "30d",
    }
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

export const issueAccessToken = async (
  user: AuthUser,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const accessToken = request.server.jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    {
      expiresIn: "10m",
    }
  );

  reply.setCookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
};
