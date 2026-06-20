import { LoginDto, SignupDto } from "@repo/shared";
import bcrypt from "bcrypt";
import { createUser, findExistingUser } from "./auth.repository";
import { googleClient } from "./googleOauthClient";

export const signupService = async (data: SignupDto) => {
  const { email, name, password } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await findExistingUser(email);

  if (existingUser) {
    if (existingUser.provider === "google") {
      throw new Error(
        "Account already exists with Google. Please sign in with Google."
      );
    }

    throw new Error("User already exists");
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
    throw new Error("Invalid credentials");
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) throw new Error("Invalid credentials");

  return user;
}

export const googleOauthService = async (token: string) => {
  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new Error("Email not found");
  }

  const { email, picture, sub, name } = payload;

  if (!sub) {
    throw new Error("Provider id not found");
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
