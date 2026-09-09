import test from "node:test";
import assert from "node:assert/strict";
import {
  STANDINGS_HEADER,
  formatStandingsCsv,
  money,
  parseStandingsCsv,
} from "./csv";
import { canonicalName } from "./aliases";
import {
  applySessionToCsv,
  applySessionToGames,
  findDuplicateSession,
  makeGameId,
  normalizeSession,
  parseGamesFile,
  sessionFingerprint,
} from "./session";
import { buildStandingsUpdate } from "./update";
import { commitMessageFor } from "./publish";
import {
  buildSessionDraft,
  dollarsFromCents,
  localDateString,
} from "./fromRecap";
import type { SessionDraft } from "./types";

const EMPTY_CSV = `${STANDINGS_HEADER}\n0,TOTAL,0.00,,0.00,,0.00,\n`;

function csvOf(rows: string[]): string {
  return `${STANDINGS_HEADER}\n${rows.join("\n")}\n0,TOTAL,0.00,,0.00,,0.00,\n`;
}

const session: SessionDraft = {
  date: "2026-09-09",
  title: "Home Cash Game",
  mode: "cash",
  players: [
    { name: "Toby", buyIn: 40, cashOut: 65, buyIns: 1 },
    { name: "Coffey", buyIn: 20, cashOut: 0, buyIns: 1 },
  ],
};

test("money formats two decimals and never emits -0.00", () => {
  assert.equal(money(40), "40.00");
  assert.equal(money(66.2963), "66.30");
  assert.equal(money(-0.001), "0.00");
  // Ties round away from zero, matching every value already in the CSVs.
  assert.equal(money(-18.035), "-18.04");
  assert.equal(money(18.035), "18.04");
});

test("aliases resolve to canonical sheet names", () => {
  assert.equal(canonicalName("Noble"), "Ham");
  assert.equal(canonicalName("ChristopherTobyTobin"), "Toby");
  assert.equal(canonicalName("kyle"), "Martell");
  assert.equal(canonicalName("  Randell "), "Randell");
});

test("parse then format is a no-op for a well-formed CSV", () => {
  const text = csvOf([
    "3,Alice,120.00,40.00,180.00,60.00,60.00,20.00",
    "2,Bob,80.00,40.00,20.00,10.00,-60.00,-30.00",
  ]).replace("0,TOTAL,0.00,,0.00,,0.00,", "5,TOTAL,200.00,,200.00,,0.00,");
  assert.equal(formatStandingsCsv(parseStandingsCsv(text)), text);
});

test("derived columns are recomputed from games / buy-in / cash-out", () => {
  const csv = parseStandingsCsv(
    csvOf(["23,Ham,875.00,38.04,460.00,20.00,-415.00,-18.04"]),
  );
  const next = applySessionToCsv(csv, {
    date: "2026-09-09",
    title: "Home Cash Game",
    mode: "cash",
    players: [{ name: "Ham", buyIn: 20, cashOut: 55, buyIns: 1 }],
  });
  // The worked example straight out of the skill's docs.
  assert.match(
    formatStandingsCsv(next),
    /^24,Ham,895\.00,37\.29,515\.00,21\.46,-380\.00,-15\.83$/m,
  );
});

test("new players are added with a single game", () => {
  const next = applySessionToCsv(parseStandingsCsv(EMPTY_CSV), session);
  const text = formatStandingsCsv(next);
  assert.match(text, /^1,Toby,40\.00,40\.00,65\.00,65\.00,25\.00,25\.00$/m);
  assert.match(text, /^1,Coffey,20\.00,20\.00,0\.00,0\.00,-20\.00,-20\.00$/m);
  assert.match(text, /^2,TOTAL,60\.00,,65\.00,,5\.00,$/m);
});

test("rows are sorted by net descending with TOTAL last", () => {
  const next = applySessionToCsv(parseStandingsCsv(EMPTY_CSV), {
    ...session,
    players: [
      { name: "Loser", buyIn: 60, cashOut: 0, buyIns: 1 },
      { name: "Winner", buyIn: 20, cashOut: 80, buyIns: 1 },
    ],
  });
  const lines = formatStandingsCsv(next).trim().split("\n");
  assert.equal(lines[1].split(",")[1], "Winner");
  assert.equal(lines[2].split(",")[1], "Loser");
  assert.equal(lines[3].split(",")[1], "TOTAL");
});

test("game ids kebab-case the title and de-duplicate same-day sessions", () => {
  assert.equal(
    makeGameId("2026-09-09", "Home Cash Game", new Set()),
    "2026-09-09-home-cash-game",
  );
  assert.equal(
    makeGameId(
      "2026-09-09",
      "Home Cash Game",
      new Set(["2026-09-09-home-cash-game"]),
    ),
    "2026-09-09-home-cash-game-2",
  );
});

test("games.json entries are prepended and keep whole-dollar amounts", () => {
  const before = parseGamesFile(
    JSON.stringify({
      games: [{ id: "old", date: "2026-09-01", title: "X", mode: "cash", players: [] }],
    }),
  );
  const { games, entry } = applySessionToGames(before, session);
  assert.equal(games.games.length, 2);
  assert.equal(games.games[0].id, "2026-09-09-home-cash-game");
  assert.equal(games.games[1].id, "old");
  assert.deepEqual(entry.players[0], {
    name: "Toby",
    buyIn: 40,
    cashOut: 65,
    buyIns: 1,
  });
  assert.equal("durationMinutes" in entry, false);
});

test("normalizeSession applies aliases and drops blank rows", () => {
  const normalized = normalizeSession({
    ...session,
    players: [
      { name: "Noble", buyIn: 20, cashOut: 30, buyIns: 1 },
      { name: "   ", buyIn: 10, cashOut: 0, buyIns: 1 },
    ],
  });
  assert.equal(normalized.players.length, 1);
  assert.equal(normalized.players[0].name, "Ham");
});

test("buildStandingsUpdate warns about an unbalanced night", () => {
  const update = buildStandingsUpdate(
    { overallCsv: EMPTY_CSV, modeCsv: EMPTY_CSV, gamesJson: '{"games":[]}' },
    session,
  );
  assert.equal(update.warnings.length, 1);
  assert.match(update.warnings[0], /off by \$5\.00/);
});

test("buildStandingsUpdate flags an already-recorded session", () => {
  const first = buildStandingsUpdate(
    { overallCsv: EMPTY_CSV, modeCsv: EMPTY_CSV, gamesJson: '{"games":[]}' },
    session,
  );
  const second = buildStandingsUpdate(
    {
      overallCsv: first.files.overallCsv,
      modeCsv: first.files.modeCsv,
      gamesJson: first.files.gamesJson,
    },
    session,
  );
  assert.ok(second.duplicateOf, "second pass should detect the duplicate");
  assert.match(second.warnings.join(" "), /already recorded/);
  // The id still differs, so publishing twice is possible but never silent.
  assert.equal(second.entry.id, "2026-09-09-home-cash-game-2");
});

test("buildStandingsUpdate reports per-player before/after", () => {
  const update = buildStandingsUpdate(
    {
      overallCsv: csvOf(["31,Toby,1370.00,44.19,1340.00,43.23,-30.00,-0.97"]),
      modeCsv: EMPTY_CSV,
      gamesJson: '{"games":[]}',
    },
    session,
  );
  const toby = update.changes.find((c) => c.name === "Toby");
  assert.deepEqual(toby, {
    name: "Toby",
    gamesBefore: 31,
    gamesAfter: 32,
    netBefore: -30,
    netAfter: -5,
    isNewPlayer: false,
  });
  assert.equal(
    update.changes.find((c) => c.name === "Coffey")?.isNewPlayer,
    true,
  );
});

test("buildStandingsUpdate flags a name that appears twice", () => {
  const update = buildStandingsUpdate(
    { overallCsv: EMPTY_CSV, modeCsv: EMPTY_CSV, gamesJson: '{"games":[]}' },
    {
      ...session,
      players: [
        { name: "Toby", buyIn: 20, cashOut: 20, buyIns: 1 },
        { name: "Chris", buyIn: 20, cashOut: 20, buyIns: 1 },
      ],
    },
  );
  assert.match(update.warnings.join(" "), /Toby appears twice/);
});

test("duplicate detection ignores title and buy-in count", () => {
  const games = parseGamesFile(
    JSON.stringify({
      games: [
        {
          id: "2026-09-09-home-cash-game",
          date: "2026-09-09",
          title: "Different Title",
          mode: "cash",
          players: [
            { name: "Coffey", buyIn: 20, cashOut: 0, buyIns: 3 },
            { name: "Toby", buyIn: 40, cashOut: 65, buyIns: 1 },
          ],
        },
      ],
    }),
  );
  assert.ok(findDuplicateSession(games, session));
  assert.equal(
    findDuplicateSession(games, { ...session, mode: "tournament" }),
    undefined,
  );
});

test("fingerprints are order-independent but result-sensitive", () => {
  const reversed = { ...session, players: [...session.players].reverse() };
  assert.equal(sessionFingerprint(session), sessionFingerprint(reversed));

  const changed = {
    ...session,
    players: [session.players[0], { ...session.players[1], cashOut: 10 }],
  };
  assert.notEqual(sessionFingerprint(session), sessionFingerprint(changed));
});

test("commit messages match the existing history style", () => {
  assert.equal(
    commitMessageFor(session),
    "Add Sep 9 cash game to standings.",
  );
  assert.equal(
    commitMessageFor({ ...session, date: "2026-12-24", mode: "tournament" }),
    "Add Dec 24 tournament game to standings.",
  );
});

test("the session date is the local calendar night, not the UTC one", () => {
  // A game that ends at 11:30pm local belongs to that night, even where the
  // UTC clock has already rolled over.
  const lateNight = new Date(2026, 8, 9, 23, 30).getTime();
  assert.equal(localDateString(lateNight), "2026-09-09");
  assert.equal(localDateString(new Date(2026, 0, 5, 0, 5).getTime()), "2026-01-05");
});

test("cash recap rows convert cents to whole dollars", () => {
  assert.equal(dollarsFromCents(2000), 20);
  assert.equal(dollarsFromCents(2050), 21);

  const draft = buildSessionDraft({
    title: "Home Cash Game",
    mode: "cash",
    startedAt: Date.parse("2026-09-09T20:00:00Z"),
    endedAt: Date.parse("2026-09-09T22:40:00Z"),
    rows: [{ name: "Noble", buyIn: 20, cashOut: 30, buyIns: 2 }],
  });
  assert.equal(draft.durationMinutes, 160);
  assert.equal(draft.mode, "cash");
  assert.deepEqual(draft.players, [
    { name: "Ham", buyIn: 20, cashOut: 30, buyIns: 2 },
  ]);
});
