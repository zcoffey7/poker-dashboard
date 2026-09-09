// End-to-end integration test for the recap screen's "Update Sheet" button.
//
// It exercises the whole loop the feature depends on, with only the network
// boundary stubbed:
//
//   recap rows  →  session draft  →  fold into the real stats/ files
//        →  Git Data API commit (stub GitHub with a real object model)
//        →  deploy workflow's bundle step
//        →  live standings page's own parseCsv / computeTotals
//
// The stub GitHub enforces fast-forward semantics, so the concurrency test
// below is a real lost-update check rather than a mocked one.
//
// Run with: npm run test:integration

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";

import { startFakeGitHub, type FakeGitHub } from "./fake-github";
import { publishSession } from "../lib/standings/publish";
import { buildSessionDraft, dollarsFromCents } from "../lib/standings/fromRecap";
import { GitHubError, type RepoConfig } from "../lib/standings/github";
import {
  GAMES_JSON_PATH,
  OVERALL_CSV_PATH,
  CASH_CSV_PATH,
  TOURNAMENT_CSV_PATH,
  type SessionDraft,
} from "../lib/standings/types";
import { parseStandingsCsv, formatStandingsCsv } from "../lib/standings/csv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const TOKEN = "github_pat_integration_test";
const OWNER = "zcoffey7";
const REPO = "poker-dashboard";
const BRANCH = "main";

const TRACKED = [
  OVERALL_CSV_PATH,
  CASH_CSV_PATH,
  TOURNAMENT_CSV_PATH,
  GAMES_JSON_PATH,
];

function realRepoFiles(): Record<string, string> {
  return Object.fromEntries(
    TRACKED.map((p) => [p, fs.readFileSync(path.join(REPO_ROOT, p), "utf8")]),
  );
}

let gh: FakeGitHub;
let config: RepoConfig;

before(async () => {
  gh = await startFakeGitHub({
    owner: OWNER,
    repo: REPO,
    branch: BRANCH,
    token: TOKEN,
    files: realRepoFiles(),
  });
  config = {
    owner: OWNER,
    repo: REPO,
    branch: BRANCH,
    token: TOKEN,
    apiBaseUrl: gh.baseUrl,
  };
});

after(async () => {
  await gh?.close();
});

/** Recreates the seeded repo so each test starts from the committed stats/. */
async function freshRepo(): Promise<void> {
  await gh.close();
  gh = await startFakeGitHub({
    owner: OWNER,
    repo: REPO,
    branch: BRANCH,
    token: TOKEN,
    files: realRepoFiles(),
  });
  config = { ...config, apiBaseUrl: gh.baseUrl };
}

// ---------------------------------------------------------------------------
// CSV invariants, asserted independently of the production code that made them
// ---------------------------------------------------------------------------

type OracleRow = {
  games: number;
  name: string;
  buyIn: number;
  avgBuyIn: number;
  cashOut: number;
  avgCashOut: number;
  net: number;
  netPerGame: number;
  raw: string[];
};

function oracle(csv: string): { rows: OracleRow[]; total: OracleRow } {
  const lines = csv.trim().split("\n");
  const parsed = lines.slice(1).map((line) => {
    const c = line.split(",");
    return {
      games: Number.parseInt(c[0], 10),
      name: c[1],
      buyIn: Number.parseFloat(c[2]),
      avgBuyIn: Number.parseFloat(c[3]),
      cashOut: Number.parseFloat(c[4]),
      avgCashOut: Number.parseFloat(c[5]),
      net: Number.parseFloat(c[6]),
      netPerGame: Number.parseFloat(c[7]),
      raw: c,
    };
  });
  const total = parsed.find((r) => r.name === "TOTAL");
  assert.ok(total, "CSV must keep a TOTAL row");
  return { rows: parsed.filter((r) => r.name !== "TOTAL"), total };
}

function assertCsvInvariants(csv: string, label: string): void {
  assert.ok(csv.endsWith("\n"), `${label}: must end with a trailing newline`);
  const { rows, total } = oracle(csv);

  for (const row of rows) {
    assert.equal(row.raw.length, 8, `${label}: ${row.name} needs 8 columns`);
    for (const col of [2, 3, 4, 5, 6, 7]) {
      assert.match(
        row.raw[col],
        /^-?\d+\.\d{2}$/,
        `${label}: ${row.name} column ${col} must be 2dp`,
      );
    }
    assert.equal(
      row.avgBuyIn.toFixed(2),
      (row.buyIn / row.games).toFixed(2),
      `${label}: ${row.name} avg buy-in`,
    );
    assert.equal(
      row.avgCashOut.toFixed(2),
      (row.cashOut / row.games).toFixed(2),
      `${label}: ${row.name} avg cash out`,
    );
    assert.equal(
      row.net.toFixed(2),
      (row.cashOut - row.buyIn).toFixed(2),
      `${label}: ${row.name} net`,
    );
    assert.equal(
      row.netPerGame.toFixed(2),
      (row.net / row.games).toFixed(2),
      `${label}: ${row.name} net per game`,
    );
  }

  for (let i = 1; i < rows.length; i++) {
    assert.ok(
      rows[i - 1].net >= rows[i].net,
      `${label}: rows must stay sorted by net descending`,
    );
  }

  assert.equal(
    total.games,
    rows.reduce((s, r) => s + r.games, 0),
    `${label}: TOTAL games`,
  );
  assert.equal(
    total.buyIn.toFixed(2),
    rows.reduce((s, r) => s + r.buyIn, 0).toFixed(2),
    `${label}: TOTAL buy-in`,
  );
  assert.equal(
    total.cashOut.toFixed(2),
    rows.reduce((s, r) => s + r.cashOut, 0).toFixed(2),
    `${label}: TOTAL cash out`,
  );
  assert.equal(
    total.net.toFixed(2),
    (total.cashOut - total.buyIn).toFixed(2),
    `${label}: TOTAL net`,
  );
  assert.equal(total.raw[3], "", `${label}: TOTAL avg buy-in stays blank`);
  assert.equal(total.raw[5], "", `${label}: TOTAL avg cash out stays blank`);
  assert.equal(total.raw[7], "", `${label}: TOTAL net per game stays blank`);
}

// ---------------------------------------------------------------------------
// Sessions, built the same way the recap screens build them
// ---------------------------------------------------------------------------

const CASH_DATE = "2026-09-09";
const TOURNAMENT_DATE = "2026-09-10";

/** Mirrors what CashRecap passes in: cents from the store, dollars to the sheet. */
function cashSession(): SessionDraft {
  const started = Date.parse("2026-09-09T23:00:00Z");
  return {
    ...buildSessionDraft({
      title: "Home Cash Game",
      mode: "cash",
      startedAt: started,
      endedAt: started + 160 * 60_000,
      rows: [
        { name: "Toby", buyIn: dollarsFromCents(4000), cashOut: dollarsFromCents(9000), buyIns: 1 },
        { name: "Noble", buyIn: dollarsFromCents(2000), cashOut: dollarsFromCents(3000), buyIns: 1 },
        { name: "Coffey", buyIn: dollarsFromCents(6000), cashOut: dollarsFromCents(0), buyIns: 3 },
        { name: "Newcomer", buyIn: dollarsFromCents(2000), cashOut: dollarsFromCents(2000), buyIns: 1 },
      ],
    }),
    // Pinned so the expected game id doesn't shift with the runner's timezone.
    date: CASH_DATE,
  };
}

function tournamentSession(): SessionDraft {
  const started = Date.parse("2026-09-10T22:00:00Z");
  return {
    ...buildSessionDraft({
      title: "Home Game Tournament",
      mode: "tournament",
      startedAt: started,
      endedAt: started + 200 * 60_000,
      rows: [
        { name: "Mercer", buyIn: 30, cashOut: 150, buyIns: 1 },
        { name: "Kyle", buyIn: 60, cashOut: 0, buyIns: 2 },
        { name: "Randell", buyIn: 60, cashOut: 0, buyIns: 2 },
      ],
    }),
    date: TOURNAMENT_DATE,
  };
}

function gameIds(json: string): string[] {
  return (JSON.parse(json) as { games: Array<{ id: string }> }).games.map(
    (g) => g.id,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("folding a session never rewrites the untouched parts of the committed CSVs", () => {
  // If parse→format isn't byte-stable against the real files, every publish
  // would produce a noisy diff and we couldn't trust the fold.
  for (const p of [OVERALL_CSV_PATH, CASH_CSV_PATH, TOURNAMENT_CSV_PATH]) {
    const original = fs.readFileSync(path.join(REPO_ROOT, p), "utf8");
    assert.equal(
      formatStandingsCsv(parseStandingsCsv(original)),
      original,
      `${p} should round-trip byte-identically`,
    );
  }
});

test("publishing a cash game commits all three files in one revision", async () => {
  await freshRepo();
  const before = gh.filesAtHead();
  const parentSha = gh.headSha();

  const { update, commit } = await publishSession(config, cashSession());

  assert.equal(commit.commitSha, gh.headSha(), "branch should point at the new commit");

  const log = gh.commitLog();
  const head = log.find((c) => c.sha === commit.commitSha);
  assert.ok(head);
  assert.deepEqual(head.parents, [parentSha], "commit must build on the read tip");
  assert.equal(head.message, "Add Sep 9 cash game to standings.");
  assert.equal(
    log.filter((c) => c.message.startsWith("Add ")).length,
    1,
    "one session must produce exactly one commit, not one per file",
  );

  const after = gh.filesAtHead();
  const changed = TRACKED.filter((p) => after[p] !== before[p]);
  assert.deepEqual(
    changed.sort(),
    [CASH_CSV_PATH, GAMES_JSON_PATH, OVERALL_CSV_PATH].sort(),
    "the tournament CSV must be left alone by a cash session",
  );

  assertCsvInvariants(after[OVERALL_CSV_PATH], "overall");
  assertCsvInvariants(after[CASH_CSV_PATH], "cash");

  assert.match(update.entry.id, new RegExp(`^${CASH_DATE}-home-cash-game(-\\d+)?$`));
  assert.equal(
    gameIds(before[GAMES_JSON_PATH]).includes(update.entry.id),
    false,
    "the new entry must not reuse an existing id",
  );
  assert.equal(gameIds(after[GAMES_JSON_PATH])[0], update.entry.id);
});

test("the committed totals move by exactly one session's worth", async () => {
  await freshRepo();
  const before = gh.filesAtHead();
  const session = cashSession();

  await publishSession(config, session);
  const after = gh.filesAtHead();

  const sessionBuyIn = session.players.reduce((s, p) => s + p.buyIn, 0);
  const sessionCashOut = session.players.reduce((s, p) => s + p.cashOut, 0);

  for (const [label, file] of [
    ["overall", OVERALL_CSV_PATH],
    ["cash", CASH_CSV_PATH],
  ] as const) {
    const b = oracle(before[file]).total;
    const a = oracle(after[file]).total;
    assert.equal(a.games - b.games, session.players.length, `${label} games`);
    assert.equal(
      Number((a.buyIn - b.buyIn).toFixed(2)),
      sessionBuyIn,
      `${label} buy-in`,
    );
    assert.equal(
      Number((a.cashOut - b.cashOut).toFixed(2)),
      sessionCashOut,
      `${label} cash out`,
    );
  }
});

test("aliases, rebuys and new players land correctly in both files", async () => {
  await freshRepo();
  const before = gh.filesAtHead();
  await publishSession(config, cashSession());
  const after = gh.filesAtHead();

  const beforeRows = new Map(oracle(before[OVERALL_CSV_PATH]).rows.map((r) => [r.name, r]));
  const afterRows = new Map(oracle(after[OVERALL_CSV_PATH]).rows.map((r) => [r.name, r]));

  // "Noble" is an alias for Ham and must not create a second row.
  assert.equal(afterRows.has("Noble"), false);
  const hamBefore = beforeRows.get("Ham")!;
  const hamAfter = afterRows.get("Ham")!;
  assert.equal(hamAfter.games, hamBefore.games + 1);
  assert.equal(hamAfter.buyIn, hamBefore.buyIn + 20);
  assert.equal(hamAfter.cashOut, hamBefore.cashOut + 30);

  // A player the sheet has never seen starts at one game.
  const newcomer = afterRows.get("Newcomer")!;
  assert.equal(newcomer.games, 1);
  assert.equal(newcomer.net, 0);
  assert.equal(beforeRows.has("Newcomer"), false);

  // Rebuys roll into the buy-in total and the buy-in count reaches history.
  const games = JSON.parse(after[GAMES_JSON_PATH]) as {
    games: Array<{
      id: string;
      mode: string;
      durationMinutes?: number;
      players: Array<{ name: string; buyIn: number; cashOut: number; buyIns: number }>;
    }>;
  };
  const entry = games.games[0];
  assert.equal(entry.mode, "cash", "newest entry must be the session we just published");
  assert.equal(entry.durationMinutes, 160);
  const coffey = entry.players.find((p) => p.name === "Coffey")!;
  assert.equal(coffey.buyIns, 3);
  assert.equal(coffey.buyIn, 60);
  assert.equal(
    entry.players.some((p) => p.name === "Noble"),
    false,
    "history must record canonical names too",
  );
});

test("history stays newest-first and never loses an existing session", async () => {
  await freshRepo();
  const before = JSON.parse(gh.filesAtHead()[GAMES_JSON_PATH]) as {
    games: Array<{ id: string }>;
  };

  await publishSession(config, cashSession());
  const after = JSON.parse(gh.filesAtHead()[GAMES_JSON_PATH]) as {
    games: Array<{ id: string }>;
  };

  assert.equal(after.games.length, before.games.length + 1);
  assert.deepEqual(
    after.games.slice(1).map((g) => g.id),
    before.games.map((g) => g.id),
    "existing history must be preserved in order",
  );
  assert.equal(new Set(after.games.map((g) => g.id)).size, after.games.length);
  assert.ok(
    gh.filesAtHead()[GAMES_JSON_PATH].endsWith("\n"),
    "games.json keeps its trailing newline",
  );
});

test("a tournament session updates the tournament CSV and leaves cash alone", async () => {
  await freshRepo();
  const before = gh.filesAtHead();

  await publishSession(config, tournamentSession());
  const after = gh.filesAtHead();

  assert.equal(after[CASH_CSV_PATH], before[CASH_CSV_PATH]);
  assert.notEqual(after[TOURNAMENT_CSV_PATH], before[TOURNAMENT_CSV_PATH]);
  assertCsvInvariants(after[TOURNAMENT_CSV_PATH], "tournament");
  assertCsvInvariants(after[OVERALL_CSV_PATH], "overall");

  // "Kyle" is an alias for Martell in the sheet.
  const rows = oracle(after[TOURNAMENT_CSV_PATH]).rows.map((r) => r.name);
  assert.ok(rows.includes("Martell"));
  assert.equal(rows.includes("Kyle"), false);

  const entry = (
    JSON.parse(after[GAMES_JSON_PATH]) as { games: Array<{ mode: string }> }
  ).games[0];
  assert.equal(entry.mode, "tournament");
});

test("back-to-back sessions accumulate instead of overwriting", async () => {
  await freshRepo();
  const before = oracle(gh.filesAtHead()[OVERALL_CSV_PATH]).total;

  await publishSession(config, cashSession());
  await publishSession(config, tournamentSession());

  const after = oracle(gh.filesAtHead()[OVERALL_CSV_PATH]).total;
  assert.equal(after.games - before.games, 4 + 3);
  assertCsvInvariants(gh.filesAtHead()[OVERALL_CSV_PATH], "overall");

  const games = JSON.parse(gh.filesAtHead()[GAMES_JSON_PATH]) as {
    games: Array<{ mode: string }>;
  };
  assert.equal(games.games[0].mode, "tournament");
  assert.equal(games.games[1].mode, "cash");
});

test("a competing push mid-publish is rebuilt on, not clobbered", async () => {
  await freshRepo();
  const before = gh.filesAtHead();

  // A laptop pushes an unrelated change after we read the tip but before our
  // ref update lands. GitHub rejects the stale parent; we must redo the fold.
  gh.advanceOnNextRefUpdate(
    { "README.md": "pushed from a laptop\n" },
    "Unrelated laptop commit",
  );

  await publishSession(config, cashSession());
  const after = gh.filesAtHead();

  assert.equal(
    after["README.md"],
    "pushed from a laptop\n",
    "the competing commit must survive",
  );
  assertCsvInvariants(after[OVERALL_CSV_PATH], "overall");

  // Exactly one session's worth of movement — not two, and not zero.
  const b = oracle(before[OVERALL_CSV_PATH]).total;
  const a = oracle(after[OVERALL_CSV_PATH]).total;
  assert.equal(a.games - b.games, 4);

  const games = JSON.parse(after[GAMES_JSON_PATH]) as { games: unknown[] };
  const beforeGames = JSON.parse(before[GAMES_JSON_PATH]) as { games: unknown[] };
  assert.equal(games.games.length, beforeGames.games.length + 1);
});

test("a bad token fails loudly and changes nothing", async () => {
  await freshRepo();
  const before = gh.filesAtHead();

  await assert.rejects(
    () => publishSession({ ...config, token: "wrong" }, cashSession()),
    (err: unknown) => {
      assert.ok(err instanceof GitHubError);
      assert.equal(err.status, 401);
      assert.match(err.message, /Contents: Read and write/);
      return true;
    },
  );

  assert.deepEqual(gh.filesAtHead(), before, "nothing may be written");
});

test("an unreachable branch fails before any write", async () => {
  await freshRepo();
  const before = gh.filesAtHead();

  await assert.rejects(
    () => publishSession({ ...config, branch: "nope" }, cashSession()),
    (err: unknown) => {
      assert.ok(err instanceof GitHubError);
      assert.equal(err.status, 404);
      return true;
    },
  );

  assert.deepEqual(gh.filesAtHead(), before);
});

test("the client only talks to the endpoints it needs", async () => {
  await freshRepo();
  gh.requests.length = 0;
  await publishSession(config, cashSession());

  const routes = gh.requests.map((r) => `${r.method} ${r.path.split("?")[0]}`);
  const prefix = `/repos/${OWNER}/${REPO}`;

  assert.equal(routes[0], `GET ${prefix}/git/ref/heads/${BRANCH}`);
  assert.equal(
    routes.filter((r) => r.startsWith(`GET ${prefix}/contents/`)).length,
    3,
    "reads exactly the three files it folds into",
  );
  assert.equal(
    routes.filter((r) => r === `POST ${prefix}/git/blobs`).length,
    3,
  );
  assert.equal(routes.filter((r) => r === `POST ${prefix}/git/trees`).length, 1);
  assert.equal(routes.filter((r) => r === `POST ${prefix}/git/commits`).length, 1);
  assert.equal(
    routes.filter((r) => r === `PATCH ${prefix}/git/refs/heads/${BRANCH}`).length,
    1,
  );
  assert.ok(
    gh.requests.every((r) => r.auth === `Bearer ${TOKEN}`),
    "every request must carry the token",
  );
});

// ---------------------------------------------------------------------------
// The published files must still render on the live standings page
// ---------------------------------------------------------------------------

function extractFunction(src: string, name: string): string {
  const start = src.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`function ${name} not found`);
  let depth = 0;
  let opened = false;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") {
      depth++;
      opened = true;
    } else if (src[i] === "}") {
      depth--;
      if (opened && depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces extracting ${name}`);
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

test("the standings page renders what the phone just published", async () => {
  await freshRepo();
  await publishSession(config, cashSession());
  await publishSession(config, tournamentSession());
  const published = gh.filesAtHead();

  // Reproduce the deploy workflow's bundle step against the published files
  // rather than the working tree, then serve it like GitHub Pages does.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "poker-update-sheet-"));
  const standings = path.join(dir, "standings");
  fs.mkdirSync(standings, { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, "stats/poker-summary.html"),
    path.join(standings, "index.html"),
  );
  for (const src of TRACKED) {
    fs.writeFileSync(path.join(standings, path.basename(src)), published[src]);
  }

  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (url.endsWith("/")) url += "index.html";
    const fp = path.join(dir, url);
    if (!fp.startsWith(dir) || !fs.existsSync(fp)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(fp)] ?? "application/octet-stream",
    });
    res.end(fs.readFileSync(fp));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const html = await (await fetch(`${base}/standings/`)).text();
    const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    const palette = script.match(/const\s+HUE_PALETTE\s*=\s*(\[[^\]]+\])/)![1];
    const minGames = script.match(/const\s+MIN_GAMES\s*=\s*(\d+)/)![1];

    const harness = new Function(`
      const MIN_GAMES = ${minGames};
      const HUE_PALETTE = ${palette};
      ${extractFunction(script, "assignHues")}
      ${extractFunction(script, "parseCsv")}
      ${extractFunction(script, "computeTotals")}
      return { parseCsv, computeTotals };
    `)() as {
      parseCsv: (text: string, minGames?: number) => Array<{
        name: string;
        games: number;
        net: number;
      }>;
      computeTotals: (players: unknown[]) => { totalGames: number };
    };

    for (const file of [OVERALL_CSV_PATH, CASH_CSV_PATH, TOURNAMENT_CSV_PATH]) {
      const served = await (
        await fetch(`${base}/standings/${path.basename(file)}`)
      ).text();
      assert.equal(served, published[file], `${file} served verbatim`);

      // minGames 1 so newcomers from this session are included.
      const players = harness.parseCsv(served, 1);
      const expected = oracle(served).rows;
      assert.equal(
        players.length,
        expected.length,
        `${file}: page must parse every published row`,
      );
      assert.deepEqual(
        new Set(players.map((p) => p.name)),
        new Set(expected.map((r) => r.name)),
      );
      assert.equal(
        harness.computeTotals(players).totalGames,
        expected.reduce((s, r) => s + r.games, 0),
        `${file}: page totals must match the published TOTAL row`,
      );
    }

    // The History tab reads games.json directly; it must stay well-formed and
    // internally balanced after the publish.
    const servedGames = await (
      await fetch(`${base}/standings/games.json`)
    ).text();
    assert.equal(servedGames, published[GAMES_JSON_PATH]);
    const parsedGames = JSON.parse(servedGames) as {
      games: Array<{
        id: string;
        date: string;
        mode: string;
        players: Array<{ name: string; buyIn: number; cashOut: number; buyIns: number }>;
      }>;
    };
    for (const game of parsedGames.games) {
      assert.match(game.date, /^\d{4}-\d{2}-\d{2}$/, `${game.id}: date shape`);
      assert.ok(
        game.mode === "cash" || game.mode === "tournament",
        `${game.id}: mode`,
      );
      for (const p of game.players) {
        assert.ok(Number.isInteger(p.buyIn), `${game.id}/${p.name}: whole-dollar buy-in`);
        assert.ok(Number.isInteger(p.cashOut), `${game.id}/${p.name}: whole-dollar cash out`);
        assert.ok(p.buyIns >= 1, `${game.id}/${p.name}: buy-in count`);
      }
    }
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
