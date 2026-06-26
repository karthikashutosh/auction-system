import test, { expect, Page } from "@playwright/test";
import { login } from "./helpers/login";
import { createAuction } from "./helpers/createAuction";
import { placeBid } from "./placeBids";
import { logout } from "./helpers/logout";

test("buyer can place bid", async ({ page }) => {
  // Seller
  await login(page);

  const { auctionId } = await createAuction(page);

  await logout(page);

  // Buyer
  await login(page, {
    email: "arvindhashok112@gmail.com",
    password: "Think@123",
  });

  await placeBid(page, {
    auctionId,
    amount: 100100,
  });

  await expect(page.getByTestId("current-price")).toContainText("100,100");
});
