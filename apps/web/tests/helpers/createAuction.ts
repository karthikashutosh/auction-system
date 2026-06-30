import { expect, Page } from "@playwright/test";

export async function createAuction(page: Page) {
  await page.getByTestId("create-auction-nav-button").click();

  await expect(page).toHaveURL("/create");

  const auctionTitle = `Playwright MacBook ${Date.now()}`;

  await page.getByTestId("auction-title-input").fill(auctionTitle);

  await page
    .getByTestId("auction-description-input")
    .fill("Created from Playwright");

  await page.getByTestId("auction-starting-price-input").fill("100000");

  await page.getByTestId("auction-reserve-price-input").fill("120000");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await page
    .getByTestId("auction-end-date-input")
    .fill(tomorrow.toISOString().slice(0, 16));

  await page
    .locator("input[type='file']")
    .setInputFiles("tests/fixtures/baby.png");

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/auctions") &&
      response.request().method() === "POST",
  );

  await page.getByTestId("create-auction-submit-button").click();

  const response = await responsePromise;

  expect(response.status()).toBe(201);

  const { id: auctionId } = await response.json();

  await expect(page).toHaveURL("/");

  await expect(page.getByTestId(`auction-card-${auctionId}`)).toBeVisible();

  return {
    auctionId,
    auctionTitle,
  };
}
