import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { createAuction } from "./helpers/createAuction";

test("user can create auction and view auction details", async ({ page }) => {
  await login(page);

  const { auctionId, auctionTitle } = await createAuction(page);

  await page.getByTestId(`view-auction-${auctionId}`).click();

  await expect(page).toHaveURL(`/auctions/${auctionId}`);

  await expect(page.getByTestId("auction-hero")).toBeVisible();
  await expect(page.getByTestId("auction-status-card")).toBeVisible();
  await expect(page.getByTestId("auction-metrics")).toBeVisible();
  await expect(page.getByTestId("bid-feed")).toBeVisible();
  await expect(page.getByTestId("bid-form")).toBeVisible();

  await expect(page.getByText(auctionTitle).first()).toBeVisible();
  await expect(page.getByText("Created from Playwright")).toBeVisible();
});
