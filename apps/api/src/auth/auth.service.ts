import { LoginDto, SignupDto } from "@repo/shared";
import bcrypt from "bcrypt";
import { googleClient } from "./googleOauthClient";
import { createUser, findExistingUser } from "@repo/db";
import { BadRequestError, ConflictError, UnauthorizedError } from "@repo/types";

export const signupService = async (data: SignupDto) => {
  const { email, name, password } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await findExistingUser(email);

  if (existingUser) {
    if (existingUser.provider === "google") {
      throw new ConflictError(
        "Account already exists with Google. Please sign in with Google.",
        "GOOGLE_ACCOUNT_EXISTS",
      );
    }

    throw new ConflictError("User already exists", "USER_ALREADY_EXISTS");
  }

  await createUser({
    name,
    email,
    passwordHash: hashedPassword,
    provider: "local",
    providerId: null,
    avatarUrl: null,
  });

  return {
    message: "User created successfully",
  };
};

export async function loginService(data: LoginDto) {
  const { email, password } = data;

  const user = await findExistingUser(email);

  if (!user) {
    throw new UnauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
  }

  if (user.provider === "google") {
    throw new UnauthorizedError(
      "Please sign in with Google",
      "GOOGLE_SIGNIN_REQUIRED",
    );
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw new UnauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
  }
  return user;
}

export const googleOauthService = async (token: string) => {
  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new BadRequestError("Email not found", "EMAIL_NOT_FOUND");
  }
  const { email, picture, sub, name } = payload;

  if (!sub) {
    throw new BadRequestError("Google user ID not found", "GOOGLE_SUB_MISSING");
  }
  let user = await findExistingUser(email);

  if (!user) {
    user = await createUser({
      email,
      name: name ?? email,
      passwordHash: null,
      provider: "google",
      providerId: sub,
      avatarUrl: picture ?? null,
    });
  }

  return user;
};
