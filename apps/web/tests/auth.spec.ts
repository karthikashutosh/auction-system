import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";

test("user can login", async ({ page }) => {
  await page.goto("/login");

  await page.getByTestId("email-input").fill("jayaroopini.gopal@mangoleap.com");

  await page.getByTestId("password-input").fill("Think@123");

  await page.getByTestId("login-button").click();

  await expect(page).toHaveURL("/");
});

test("user can signup", async ({ page }) => {
  await page.goto("/signup");

  const random = Date.now();
  const password = "Password@123";

  await page.getByTestId("signup-name-input").fill("Playwright User");

  await page
    .getByTestId("signup-email-input")
    .fill(`playwright${random}@test.com`);

  await page.getByTestId("signup-password-input").fill(password);

  await page.getByTestId("signup-confirm-password-input").fill(password);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/auth/signup") &&
      response.request().method() === "POST",
  );

  await page.getByTestId("signup-button").click();

  const response = await responsePromise;

  expect(response.status()).toBe(201);

  await expect(page).toHaveURL("/login");
});

test("user can logout", async ({ page }) => {
  await login(page);

  await expect(page).toHaveURL("/");

  await page.getByTestId("profile-menu-button").click();

  await page.getByTestId("logout-button").click();

  await expect(page).toHaveURL("/login");
});
