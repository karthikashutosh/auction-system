import { Page } from "@playwright/test";
import { login } from "./login";

export async function loginAsBuyer(page: Page) {
  await login(page, {
    email: "arvindhashok112@gmail.com",
    password: "Think@123",
  });
}
