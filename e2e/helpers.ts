import { expect, type Page } from "@playwright/test";

export async function seatCashPlayer(page: Page, name: string) {
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Seat Player" }).click();
  await expect(playedClock(page, name)).toBeVisible();
}

export function playedClock(page: Page, name: string) {
  return page.getByLabel(new RegExp(`^${name} played `));
}

export async function playedSeconds(page: Page, name: string): Promise<number> {
  const raw = await playedClock(page, name).getAttribute("data-played-seconds");
  return Number(raw);
}

export async function addTournamentPlayer(page: Page, name: string) {
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: `View details for ${name}` })).toBeVisible();
}

export async function openPlayersPanel(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Players" });
  if (await dialog.isVisible()) return;
  await page.getByRole("button", { name: "Players", exact: true }).click();
  await expect(dialog).toBeVisible();
}

export async function closePlayersPanel(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Players" });
  await dialog.getByLabel("Close Players").click();
  await expect(dialog).toHaveCount(0);
}
