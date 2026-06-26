import { expect, Page } from "@playwright/test";

type PlaceBidParams = {
  auctionId: string;
  amount: number;
};

export async function placeBid(
  page: Page,
  { auctionId, amount }: PlaceBidParams
) {
  await page.goto(`/auctions/${auctionId}`);

  await expect(page.getByTestId("bid-form")).toBeVisible();

  const bidResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/bids") && response.request().method() === "POST"
  );

  await page.getByTestId("bid-amount-input").fill(amount.toString());

  await page.getByTestId("place-bid-button").click();

  const response = await bidResponsePromise;

  expect(response.status()).toBe(201);

  return response.json();
}
