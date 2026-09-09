import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { startFakeGitHub, type FakeGitHub } from "../scripts/fake-github";
import {
  addTournamentPlayer,
  closePlayersPanel,
  openPlayersPanel,
} from "./helpers";

// Drives the real recap UI against a stub GitHub. Requests are intercepted at
// api.github.com — the app's genuine endpoint — and forwarded to the same
// object-model stub the integration suite uses, so nothing about the client
// code path is special-cased for the test.

const TOKEN = "github_pat_e2e_token";
const OWNER = "zcoffey7";
const REPO = "poker-dashboard";

const TRACKED = [
  "stats/PokerSummary.csv",
  "stats/PokerCashSummary.csv",
  "stats/PokerTournamentSummary.csv",
  "stats/games.json",
];

const REPO_ROOT = path.resolve(__dirname, "..");

function seedFiles(): Record<string, string> {
  return Object.fromEntries(
    TRACKED.map((p) => [p, fs.readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );
}

let gh: FakeGitHub;

test.beforeEach(async ({ page }) => {
  gh = await startFakeGitHub({
    owner: OWNER,
    repo: REPO,
    branch: "main",
    token: TOKEN,
    files: seedFiles(),
  });

  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({
      url: `${gh.baseUrl}${url.pathname}${url.search}`,
    });
    await route.fulfill({ response });
  });

  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/cash/");
  await page.evaluate(() => {
    localStorage.removeItem("poker-cash-v1");
    localStorage.removeItem("poker-tournament-v1");
    localStorage.removeItem("poker-sheet-v1");
  });
  await page.reload();
});

test.afterEach(async () => {
  await gh?.close();
});

async function seat(page: Page, name: string, dollars: number) {
  await page.getByLabel("Player name").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Amount").fill(String(dollars));
  await page.getByRole("button", { name: "Seat Player" }).click();
}

/** Seats a table, settles everyone, and ends the game to reach the recap. */
async function playAndEndCashGame(page: Page) {
  await seat(page, "Toby", 40);
  await seat(page, "Noble", 20);
  await seat(page, "Coffey", 20);

  await page.getByRole("button", { name: "End Game" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Final stack").nth(0).fill("60");
  await dialog.getByPlaceholder("Final stack").nth(1).fill("20");
  await dialog.getByPlaceholder("Final stack").nth(2).fill("0");
  await dialog.getByRole("button", { name: "End Game" }).click();

  await expect(page.getByText("Game Complete")).toBeVisible();
}

test("a finished cash game can be published to the standings from the recap", async ({
  page,
}) => {
  const before = gh.filesAtHead();
  const beforeHead = gh.headSha();

  await playAndEndCashGame(page);

  await page.getByTestId("update-sheet-button").click();

  // No token yet, so the dialog asks to connect before it will publish.
  await expect(page.getByTestId("sheet-connect")).toBeVisible();
  await expect(page.getByTestId("sheet-publish")).toBeDisabled();

  await page.getByLabel("GitHub token").fill(TOKEN);
  await page.getByRole("button", { name: "Save token" }).click();

  // The recap's own rows are what gets published.
  await expect(page.getByTestId("sheet-player-row")).toHaveCount(3);
  await expect(page.getByTestId("sheet-balance")).toHaveText("Balanced · $80");

  // "Noble" is an alias and must already read as the canonical sheet name.
  await expect(
    page.getByRole("textbox", { name: "Sheet name for player 1" }),
  ).toHaveValue("Toby");
  const names = await page
    .getByTestId("sheet-player-row")
    .locator("input[type='text'], input:not([type])")
    .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  expect(names.sort()).toEqual(["Coffey", "Ham", "Toby"]);

  await page.getByTestId("sheet-publish").click();
  await expect(page.getByTestId("sheet-success")).toBeVisible();

  // The repo really moved, in exactly one commit touching three files.
  expect(gh.headSha()).not.toBe(beforeHead);
  const log = gh.commitLog().filter((c) => c.message.startsWith("Add "));
  expect(log).toHaveLength(1);

  const after = gh.filesAtHead();
  const changed = TRACKED.filter((p) => after[p] !== before[p]).sort();
  expect(changed).toEqual(
    ["stats/PokerCashSummary.csv", "stats/PokerSummary.csv", "stats/games.json"].sort(),
  );

  const history = JSON.parse(after["stats/games.json"]) as {
    games: Array<{
      mode: string;
      players: Array<{ name: string; buyIn: number; cashOut: number }>;
    }>;
  };
  const entry = history.games[0];
  expect(entry.mode).toBe("cash");
  expect(
    entry.players
      .map((p) => `${p.name} ${p.buyIn}->${p.cashOut}`)
      .sort(),
  ).toEqual(["Coffey 20->0", "Ham 20->20", "Toby 40->60"]);

  // Success screen reports the standings movement back to the user.
  await expect(page.getByTestId("sheet-success")).toContainText("Toby");
  await expect(page.getByTestId("sheet-success")).toContainText("View commit");
});

test("publishing twice is flagged instead of silently double-counting", async ({
  page,
}) => {
  await playAndEndCashGame(page);

  await page.getByTestId("update-sheet-button").click();
  await page.getByLabel("GitHub token").fill(TOKEN);
  await page.getByRole("button", { name: "Save token" }).click();
  await page.getByTestId("sheet-publish").click();
  await expect(page.getByTestId("sheet-success")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  const afterFirst = gh.filesAtHead();

  // The button remembers this exact night was already published.
  await expect(page.getByTestId("update-sheet-button")).toHaveText(
    "Sheet updated ✓",
  );
  await page.getByTestId("update-sheet-button").click();
  await expect(page.getByTestId("sheet-already-published")).toBeVisible();

  // The warning is advisory, so confirm a deliberate second publish is still
  // possible — and that it adds a distinct history entry rather than clobbering.
  await page.getByTestId("sheet-publish").click();
  await expect(page.getByTestId("sheet-success")).toBeVisible();

  const ids = (
    JSON.parse(gh.filesAtHead()["stats/games.json"]) as {
      games: Array<{ id: string }>;
    }
  ).games.map((g) => g.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBe(
    (JSON.parse(afterFirst["stats/games.json"]) as { games: unknown[] }).games
      .length + 1,
  );
});

test("a rejected token surfaces an actionable error and writes nothing", async ({
  page,
}) => {
  const before = gh.filesAtHead();
  await playAndEndCashGame(page);

  await page.getByTestId("update-sheet-button").click();
  await page.getByLabel("GitHub token").fill("not-a-real-token");
  await page.getByRole("button", { name: "Save token" }).click();
  await page.getByTestId("sheet-publish").click();

  await expect(page.getByTestId("sheet-error")).toContainText(
    "Contents: Read and write",
  );
  await expect(page.getByTestId("sheet-success")).toHaveCount(0);
  expect(gh.filesAtHead()).toEqual(before);
});

test("a finished tournament publishes to the tournament standings", async ({
  page,
}) => {
  const before = gh.filesAtHead();

  await page.goto("/tournament/");
  await openPlayersPanel(page);
  await addTournamentPlayer(page, "Mercer");
  await addTournamentPlayer(page, "Kyle");
  await closePlayersPanel(page);
  await page.getByRole("button", { name: "Start" }).click();

  // Knocking out the second-to-last player auto-crowns a winner and ends it.
  await openPlayersPanel(page);
  await page.getByLabel("Eliminate Kyle").click();
  await expect(page.getByText("Tournament Complete")).toBeVisible();

  await page.getByTestId("update-sheet-button").click();
  await page.getByLabel("GitHub token").fill(TOKEN);
  await page.getByRole("button", { name: "Save token" }).click();
  await page.getByTestId("sheet-publish").click();
  await expect(page.getByTestId("sheet-success")).toBeVisible();

  const after = gh.filesAtHead();
  const changed = TRACKED.filter((p) => after[p] !== before[p]).sort();
  expect(changed).toEqual(
    [
      "stats/PokerSummary.csv",
      "stats/PokerTournamentSummary.csv",
      "stats/games.json",
    ].sort(),
  );
  expect(after["stats/PokerCashSummary.csv"]).toBe(
    before["stats/PokerCashSummary.csv"],
  );

  const entry = (
    JSON.parse(after["stats/games.json"]) as {
      games: Array<{
        mode: string;
        players: Array<{ name: string; buyIn: number; cashOut: number }>;
      }>;
    }
  ).games[0];
  expect(entry.mode).toBe("tournament");
  // "Kyle" is an alias for Martell in the sheet.
  expect(entry.players.map((p) => p.name).sort()).toEqual(["Martell", "Mercer"]);
  expect(entry.players.reduce((s, p) => s + p.buyIn, 0)).toBe(
    entry.players.reduce((s, p) => s + p.cashOut, 0),
  );
});

test("an unbalanced night is called out before publishing", async ({ page }) => {
  await seat(page, "Toby", 40);
  await seat(page, "Coffey", 20);
  await page.getByRole("button", { name: "End Game" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Final stack").nth(0).fill("50");
  await dialog.getByPlaceholder("Final stack").nth(1).fill("0");
  // Books are $10 short, so the end-game flow needs an explicit override.
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: /End anyway/ }).click();
  await expect(page.getByText("Game Complete")).toBeVisible();

  await page.getByTestId("update-sheet-button").click();
  await page.getByLabel("GitHub token").fill(TOKEN);
  await page.getByRole("button", { name: "Save token" }).click();

  await expect(page.getByTestId("sheet-balance")).toHaveText("Off by $10");
});
