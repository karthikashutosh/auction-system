import { Page } from "@playwright/test";
import { login } from "./login";

export async function loginAsSeller(page: Page) {
  await login(page, {
    email: "seller@test.com",
    password: "Password@123",
  });
}
