import { LoginDto, SignupDto } from "@repo/shared";
import bcrypt from "bcrypt";
import { createUser, findExistingUser } from "./auth.repository";
import jwt from "@fastify/jwt";

export const signupService = async (data: SignupDto) => {
  const { email, name, password } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await findExistingUser(email);

  if (existingUser) {
    throw new Error("User already exists");
  }

  await createUser(name, email, hashedPassword);

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
