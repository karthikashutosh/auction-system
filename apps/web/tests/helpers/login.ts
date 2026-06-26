import { expect, Page } from "@playwright/test";

type LoginParams = {
  email: string;
  password: string;
};

export async function login(page: Page, credentials?: LoginParams) {
  const { email = "jayaroopini.gopal@mangoleap.com", password = "Think@123" } =
    credentials ?? {};

  await page.goto("/login");

  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill(password);

  await page.getByTestId("login-button").click();

  await expect(page).toHaveURL("/");
}
