import { test, expect, type Page } from "@playwright/test";
import { seatCashPlayer } from "./helpers";

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/cash/");
  await page.evaluate(() => localStorage.removeItem("poker-cash-v1"));
  await page.reload();
});

function playerStack(page: Page, name: string) {
  return page.locator(`[data-testid="cash-player-stack"][data-player="${name}"]`);
}

function activeRow(page: Page, name: string) {
  return page.locator(`[data-testid="cash-active-player-row"][data-player="${name}"]`);
}

async function seatCashPlayerFor(page: Page, name: string, dollars: number) {
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Amount").fill(String(dollars));
  await page.getByRole("button", { name: "Seat Player" }).click();
}

test("avg stack and per-player stacks update as players join, rebuy, and cash out", async ({
  page,
}) => {
  const avgTile = page.getByTestId("cash-avg-stack-tile");

  await seatCashPlayer(page, "Alice");
  await expect(avgTile).toContainText("$20.00 · 100 BB");
  await expect(playerStack(page, "Alice")).toHaveText("$20.00 · 100 BB");

  await seatCashPlayerFor(page, "Bob", 50);
  await expect(avgTile).toContainText("$35.00 · 175 BB");
  await expect(playerStack(page, "Bob")).toHaveText("$50.00 · 250 BB");

  await activeRow(page, "Alice").getByTitle("Add another buy-in").click();
  await page.getByRole("button", { name: "Add Buy-in" }).click();

  await expect(playerStack(page, "Alice")).toHaveText("$40.00 · 200 BB");
  await expect(avgTile).toContainText("$45.00 · 225 BB");

  await activeRow(page, "Bob").getByTitle("Cash out this player").click();
  await page.getByLabel("Cashing out with").fill("60");
  await page.getByRole("button", { name: "Confirm Cash Out" }).click();

  await expect(avgTile).toContainText("$40.00 · 200 BB");
  await expect(playerStack(page, "Alice")).toHaveText("$40.00 · 200 BB");
  await expect(page.getByTestId("cash-player-stack")).toHaveCount(1);

  await page.getByLabel("Reopen Bob").click();
  await expect(playerStack(page, "Bob")).toHaveText("$50.00 · 250 BB");
  await expect(avgTile).toContainText("$45.00 · 225 BB");
});
