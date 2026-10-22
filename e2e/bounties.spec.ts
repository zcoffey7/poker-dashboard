import { test, expect } from "@playwright/test";
import { addTournamentPlayer, closePlayersPanel, openPlayersPanel } from "./helpers";

test("bounty counts are entered at each knockout and carried to the recap", async ({
  page,
}) => {
  await page.goto("/tournament/settings/");
  await page.getByText("Bounties", { exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /^Bounties/ })).toBeChecked();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("All changes saved")).toBeVisible();

  await page.goto("/tournament/");
  await openPlayersPanel(page);
  for (const name of ["Alice", "Bob", "Carol", "Dave"]) {
    await addTournamentPlayer(page, name);
  }
  await closePlayersPanel(page);
  await page.getByRole("button", { name: "Start" }).click();
  await openPlayersPanel(page);

  const prompt = page.getByRole("alertdialog");

  await page.getByLabel("Eliminate Dave").click();
  await expect(prompt.getByText("Winner", { exact: true })).toHaveCount(0);
  await prompt.getByRole("button", { name: "Eliminate" }).click();
  await expect(prompt).toHaveCount(0);

  // Carol had knocked out Dave.
  await page.getByLabel("Eliminate Carol").click();
  await prompt.getByRole("button", { name: "Add a bounty for Carol" }).click();
  await prompt.getByRole("button", { name: "Eliminate" }).click();
  await expect(page.getByTitle("1 bounty")).toBeVisible();

  // Bob's knockout ends the game, so the winner's count is asked for too.
  await page.getByLabel("Eliminate Bob").click();
  await expect(prompt.getByText("Winner", { exact: true })).toBeVisible();
  const addForAlice = prompt.getByRole("button", {
    name: "Add a bounty for Alice",
  });
  await addForAlice.click();
  await addForAlice.click();
  await prompt.getByRole("button", { name: "Eliminate" }).click();

  await expect(page.getByText("Tournament Complete")).toBeVisible();
  const champion = page.locator("section", { hasText: "Champion" });
  await expect(champion.getByText("Bounties")).toBeVisible();
  await expect(champion.getByText("2", { exact: true })).toBeVisible();
  await expect(page.getByTitle("1 bounty")).toHaveCount(1);
  await expect(page.getByTitle(/bount/)).toHaveCount(1);
});
