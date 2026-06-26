import { expect, Page } from "@playwright/test";

export async function logout(page: Page) {
  await page.getByTestId("profile-menu-button").click();

  await page.getByTestId("logout-button").click();

  await expect(page).toHaveURL("/login");
}
