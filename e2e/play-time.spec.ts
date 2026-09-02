import { test, expect } from "@playwright/test";
import {
  addTournamentPlayer,
  closePlayersPanel,
  openPlayersPanel,
  playedClock,
  playedSeconds,
  seatCashPlayer,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.clock.install({ time: new Date("2026-09-02T15:00:00") });
});

test("cash buy-in shows a ticking clock that freezes on cash-out", async ({
  page,
}) => {
  await page.goto("/cash/");
  await seatCashPlayer(page, "Alice");

  await expect(playedClock(page, "Alice")).toHaveAttribute(
    "data-played-seconds",
    "0",
  );
  await expect(playedClock(page, "Alice")).toContainText("00:00");

  await page.clock.fastForward(5000);
  await expect(playedClock(page, "Alice")).toHaveAttribute(
    "data-played-seconds",
    "5",
  );
  await expect(playedClock(page, "Alice")).toContainText("00:05");

  await page.getByRole("button", { name: "Cash Out" }).click();
  await page.getByLabel("Cashing out with").fill("20");
  await page.getByRole("button", { name: "Confirm Cash Out" }).click();

  await expect(playedClock(page, "Alice")).toHaveAttribute(
    "data-played-seconds",
    "5",
  );

  await page.clock.fastForward(10000);
  await expect(playedClock(page, "Alice")).toHaveAttribute(
    "data-played-seconds",
    "5",
  );
  await expect(playedClock(page, "Alice")).toContainText("00:05");
});

test("cash clocks are per-player and resume after reopen", async ({ page }) => {
  await page.goto("/cash/");
  await seatCashPlayer(page, "Alice");
  await page.clock.fastForward(8000);
  await seatCashPlayer(page, "Bob");

  expect(await playedSeconds(page, "Alice")).toBe(8);
  expect(await playedSeconds(page, "Bob")).toBe(0);

  await page.getByTitle("Cash out this player").first().click();
  await page.getByLabel("Cashing out with").fill("20");
  await page.getByRole("button", { name: "Confirm Cash Out" }).click();

  const frozen = await playedSeconds(page, "Alice");
  expect(frozen).toBe(8);

  await page.getByLabel("Reopen Alice").click();
  await page.clock.fastForward(4000);

  expect(await playedSeconds(page, "Alice")).toBe(frozen + 4);
  expect(await playedSeconds(page, "Bob")).toBeGreaterThanOrEqual(4);
});

test("cash roster shows the full name next to the clock on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cash/");
  await seatCashPlayer(page, "Coffey");

  const nameBtn = page.getByRole("button", { name: "Coffey", exact: true });
  await expect(nameBtn).toBeVisible();
  await expect(playedClock(page, "Coffey")).toBeVisible();
  const clipped = await nameBtn.evaluate(
    (el) => el.scrollWidth > el.clientWidth + 1,
  );
  expect(clipped).toBe(false);
});

test("cash clock past an hour shows 1hr 10m, not 70 minutes", async ({
  page,
}) => {
  await page.goto("/cash/");
  await seatCashPlayer(page, "Alice");
  await page.clock.fastForward(70 * 60 * 1000);
  await expect(playedClock(page, "Alice")).toContainText("1hr 10m");
  await expect(playedClock(page, "Alice")).not.toContainText("70");
  await expect(playedClock(page, "Alice")).not.toContainText("1:10");
});

test("tournament clocks start with the game and freeze on elimination", async ({
  page,
}) => {
  await page.goto("/tournament/");
  await openPlayersPanel(page);
  await addTournamentPlayer(page, "Alice");
  await addTournamentPlayer(page, "Bob");
  await addTournamentPlayer(page, "Carol");

  await expect(playedClock(page, "Alice")).toHaveCount(0);

  await closePlayersPanel(page);
  await page.getByRole("button", { name: "Start" }).click();
  await openPlayersPanel(page);

  await expect(playedClock(page, "Alice")).toBeVisible();
  await expect(playedClock(page, "Alice")).toHaveAttribute(
    "data-played-seconds",
    "0",
  );

  await page.clock.fastForward(7000);
  expect(await playedSeconds(page, "Alice")).toBe(7);
  expect(await playedSeconds(page, "Bob")).toBe(7);

  await page.getByLabel("Eliminate Alice").click();
  const frozen = await playedSeconds(page, "Alice");
  expect(frozen).toBe(7);

  await page.clock.fastForward(5000);
  expect(await playedSeconds(page, "Alice")).toBe(frozen);
  expect(await playedSeconds(page, "Bob")).toBeGreaterThanOrEqual(frozen + 5);
  expect(await playedSeconds(page, "Carol")).toBeGreaterThanOrEqual(
    frozen + 5,
  );
});
