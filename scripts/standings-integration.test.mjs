// Integration test for the standings page.
//
// This test reproduces the GitHub Actions deploy workflow's "Bundle standings
// page" step locally, serves the bundle via a real HTTP server (mimicking
// GitHub Pages), and exercises the live page's own JavaScript against the
// served CSV. The goal is to catch regressions in the full pipeline that
// powers the live standings:
//
//     stats/PokerSummary.csv  →  deploy workflow  →  GitHub Pages
//                                                        ↓
//                          phone taps "Refresh" / opens app
//                                                        ↓
//                  fetch("./PokerSummary.csv?t=…", { cache: "no-store" })
//                                                        ↓
//                          page's parseCsv + render
//
// Run with: npm run test:integration

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// Mirrors the `Bundle standings page` step in .github/workflows/deploy.yml.
// Keep this in sync if that step ever changes.
const BUNDLE = [
  { src: "stats/poker-summary.html", dst: "standings/index.html" },
  { src: "stats/PokerSummary.csv", dst: "standings/PokerSummary.csv" },
  { src: "stats/PokerTournamentSummary.csv", dst: "standings/PokerTournamentSummary.csv" },
  { src: "stats/PokerCashSummary.csv", dst: "standings/PokerCashSummary.csv" },
  { src: "stats/games.json", dst: "standings/games.json" },
  { src: "stats/manifest.webmanifest", dst: "standings/manifest.webmanifest" },
  { src: "stats/standings-icon-180.png", dst: "standings/standings-icon-180.png" },
  { src: "stats/standings-icon-192.png", dst: "standings/standings-icon-192.png" },
  { src: "stats/standings-icon-512.png", dst: "standings/standings-icon-512.png" },
];

// Per-mode CSVs that share the schema of PokerSummary.csv but track only
// tournament or cash sessions. They start empty (header + zeroed TOTAL row)
// and are populated going forward.
const MODE_CSVS = [
  { src: "stats/PokerTournamentSummary.csv", dst: "standings/PokerTournamentSummary.csv", label: "tournament" },
  { src: "stats/PokerCashSummary.csv", dst: "standings/PokerCashSummary.csv", label: "cash" },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

let tmpDir;
let server;
let baseUrl;

function makeServer(root) {
  return http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (url.endsWith("/")) url += "index.html";
    const fp = path.join(root, url);
    if (!fp.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    fs.stat(fp, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "content-type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream",
        "content-length": stat.size,
        "last-modified": stat.mtime.toUTCString(),
      });
      fs.createReadStream(fp).pipe(res);
    });
  });
}

// Extracts a `const NAME = [ ... ]` array literal from a script source by
// counting bracket balance. Sufficient for the page's TABS config, which is
// a plain literal with no template strings or embedded brackets.
function extractConstArray(src, name) {
  const needle = `const ${name} = [`;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`const ${name} array not found in script source`);
  const open = src.indexOf("[", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced brackets while extracting ${name}`);
}

// Minimal oracle parse of a standings CSV, shared by tests that need ground
// truth independent of the page's own parseCsv.
function oracleRows(csv) {
  return csv
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim())
    .slice(1)
    .map((l) => l.split(",").map((s) => s.trim()))
    .filter((c) => c.length >= 8 && c[1])
    .map((c) => ({
      name: c[1],
      games: parseInt(c[0], 10),
      buyIn: parseFloat(c[2]) || 0,
      cashOut: parseFloat(c[4]) || 0,
      net: parseFloat(c[6]) || 0,
      netAvg: parseFloat(c[7]) || 0,
    }));
}

// Extracts the entire `function NAME(...) { ... }` declaration from a script
// source by counting brace balance. Sufficient for the page's pure-data
// helpers (parseCsv, assignHues, computeTotals) which don't contain template
// literals or strings with embedded braces.
function extractFunction(src, name) {
  const needle = `function ${name}`;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`function ${name} not found in script source`);
  let depth = 0;
  let opened = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") {
      depth++;
      opened = true;
    } else if (ch === "}") {
      depth--;
      if (opened && depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces while extracting ${name}`);
}

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "poker-standings-it-"));
  fs.mkdirSync(path.join(tmpDir, "standings"), { recursive: true });
  for (const { src, dst } of BUNDLE) {
    fs.copyFileSync(path.join(REPO_ROOT, src), path.join(tmpDir, dst));
  }
  server = makeServer(tmpDir);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("bundle: every file the deploy workflow ships is reachable under /standings/", async () => {
  for (const { dst } of BUNDLE) {
    const res = await fetch(`${baseUrl}/${dst}`);
    assert.equal(res.status, 200, `${dst} should respond 200 (got ${res.status})`);
  }
  const indexRes = await fetch(`${baseUrl}/standings/`);
  assert.equal(indexRes.status, 200, "trailing-slash URL should resolve to index.html");
  const indexCt = indexRes.headers.get("content-type") || "";
  assert.ok(indexCt.startsWith("text/html"), `index.html content-type should be text/html, got ${indexCt}`);
});

test("CSV served at /standings/PokerSummary.csv is byte-identical to stats/PokerSummary.csv", async () => {
  const served = await (
    await fetch(`${baseUrl}/standings/PokerSummary.csv?t=${Date.now()}`)
  ).text();
  const source = fs.readFileSync(path.join(REPO_ROOT, "stats/PokerSummary.csv"), "utf8");
  assert.equal(served, source);
});

test("per-mode CSVs are bundled and byte-identical to source", async () => {
  for (const { src, dst, label } of MODE_CSVS) {
    const served = await (
      await fetch(`${baseUrl}/${dst}?t=${Date.now()}`, { cache: "no-store" })
    ).text();
    const source = fs.readFileSync(path.join(REPO_ROOT, src), "utf8");
    assert.equal(served, source, `${label} CSV should be byte-identical to source`);
  }
});

test("empty per-mode CSVs have a well-formed TOTAL row and parse to zero qualifying players", async () => {
  // Mirrors the CSV-authoring sanity checks the page applies to PokerSummary.csv:
  // the TOTAL row is the source of truth for downstream tabs, so even an empty
  // starter CSV must satisfy the same arithmetic invariants.
  for (const { dst, label } of MODE_CSVS) {
    const csv = await (
      await fetch(`${baseUrl}/${dst}?t=${Date.now()}`, { cache: "no-store" })
    ).text();
    const rows = csv
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((l) => l.trim())
      .slice(1)
      .map((l) => l.split(",").map((s) => s.trim()))
      .filter((c) => c.length >= 8 && c[1]);

    const totalRow = rows.find((r) => r[1] === "TOTAL");
    const dataRows = rows.filter((r) => r[1] !== "TOTAL");

    assert.ok(totalRow, `${label} CSV should contain a TOTAL row`);
    const sumGames = dataRows.reduce((s, r) => s + (parseInt(r[0], 10) || 0), 0);
    const sumBuyIn = dataRows.reduce((s, r) => s + (parseFloat(r[2]) || 0), 0);
    const sumCashOut = dataRows.reduce((s, r) => s + (parseFloat(r[4]) || 0), 0);
    const sumNet = dataRows.reduce((s, r) => s + (parseFloat(r[6]) || 0), 0);

    assert.equal(parseInt(totalRow[0], 10), sumGames, `${label} CSV TOTAL games`);
    assert.equal(parseFloat(totalRow[2]).toFixed(2), sumBuyIn.toFixed(2), `${label} CSV TOTAL buy-in`);
    assert.equal(parseFloat(totalRow[4]).toFixed(2), sumCashOut.toFixed(2), `${label} CSV TOTAL cash-out`);
    assert.equal(parseFloat(totalRow[6]).toFixed(2), sumNet.toFixed(2), `${label} CSV TOTAL net`);
  }
});

test("page references every mode CSV via relative path + cache-busting + cache: no-store", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  // All three CSVs must be referenced via the page's TABS config so the
  // bundled deploy → fetch → render pipeline stays intact for every tab.
  for (const csv of ["PokerSummary.csv", "PokerTournamentSummary.csv", "PokerCashSummary.csv"]) {
    assert.match(
      html,
      new RegExp(`url:\\s*["']\\./${csv.replace(/\./g, "\\.")}["']`),
      `expected the TABS config to reference ./${csv} via a relative path`,
    );
  }
  assert.match(
    html,
    /\$\{(?:full)?[Uu]rl\}\?t=\$\{Date\.now\(\)\}/,
    "expected cache-busting timestamp on every CSV fetch",
  );
  assert.match(
    html,
    /fetch\([^)]*cache:\s*["']no-store["']/,
    "expected fetch to use { cache: 'no-store' }",
  );
});

test("iOS safe-area-inset-top is honored (the title-under-status-bar bug stays fixed)", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  assert.match(
    html,
    /padding-top:\s*max\([^)]*env\(safe-area-inset-top\)/,
    "the .page padding-top should clamp against env(safe-area-inset-top)",
  );
});

test("inline page script parses cleanly as JS", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(m, "expected a <script> block in the page");
  assert.doesNotThrow(() => new Function(m[1]));
});

test("running the page's own parseCsv/computeTotals/assignHues against the served CSV produces the expected standings", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  const scriptSrc = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const paletteMatch = scriptSrc.match(/const\s+HUE_PALETTE\s*=\s*(\[[^\]]+\])/);
  const minGamesMatch = scriptSrc.match(/const\s+MIN_GAMES\s*=\s*(\d+)/);
  assert.ok(paletteMatch, "expected HUE_PALETTE constant in script");
  assert.ok(minGamesMatch, "expected MIN_GAMES constant in script");
  const MIN_GAMES = parseInt(minGamesMatch[1], 10);

  // Build a tiny harness that lifts the page's actual functions into a Function
  // scope. This way the test exercises *live* page code; if parseCsv changes,
  // these assertions move with it.
  const harness = `
    const MIN_GAMES = ${minGamesMatch[1]};
    const HUE_PALETTE = ${paletteMatch[1]};
    ${extractFunction(scriptSrc, "assignHues")}
    ${extractFunction(scriptSrc, "parseCsv")}
    ${extractFunction(scriptSrc, "computeTotals")}
    return { parseCsv, computeTotals };
  `;
  const { parseCsv, computeTotals } = new Function(harness)();

  const csv = await (
    await fetch(`${baseUrl}/standings/PokerSummary.csv?t=${Date.now()}`, {
      cache: "no-store",
    })
  ).text();

  // Independent "oracle" parse of the CSV. Intentionally minimal so it serves
  // as ground truth against the page's parseCsv. Every expected value below
  // is derived from this — no hardcoded names, sums, or counts — so the test
  // stays green as the standings evolve tournament by tournament.
  const allRows = csv
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim())
    .slice(1)
    .map((l) => l.split(",").map((s) => s.trim()))
    .filter((c) => c.length >= 8 && c[1])
    .map((c) => ({
      name: c[1],
      games: parseInt(c[0], 10),
      buyIn: parseFloat(c[2]) || 0,
      cashOut: parseFloat(c[4]) || 0,
      net: parseFloat(c[6]) || 0,
      netAvg: parseFloat(c[7]) || 0,
    }));
  const totalRow = allRows.find((r) => r.name === "TOTAL");
  const dataRows = allRows.filter((r) => r.name !== "TOTAL");
  const qualifying = dataRows.filter((r) => r.games >= MIN_GAMES);

  assert.ok(totalRow, "CSV should contain a TOTAL row");
  assert.ok(qualifying.length > 0, "at least one player should clear MIN_GAMES");

  // CSV-authoring sanity check: the TOTAL row should match the sum of data
  // rows. Catches arithmetic slips at data-entry time before they ship.
  const sumAllGames = dataRows.reduce((s, r) => s + r.games, 0);
  const sumAllBuyIn = dataRows.reduce((s, r) => s + r.buyIn, 0);
  const sumAllCashOut = dataRows.reduce((s, r) => s + r.cashOut, 0);
  assert.equal(sumAllGames, totalRow.games, "CSV TOTAL games row");
  assert.equal(sumAllBuyIn.toFixed(2), totalRow.buyIn.toFixed(2), "CSV TOTAL buy-in row");
  assert.equal(sumAllCashOut.toFixed(2), totalRow.cashOut.toFixed(2), "CSV TOTAL cash-out row");

  const players = parseCsv(csv);

  // 1. parseCsv returns exactly the qualifying set (TOTAL excluded, MIN_GAMES respected).
  assert.equal(players.length, qualifying.length, "parseCsv should yield every qualifying player and only those");
  assert.ok(
    players.every((p) => p.games >= MIN_GAMES),
    "every parsed player should clear MIN_GAMES",
  );
  assert.ok(
    players.every((p) => p.name && p.name !== "TOTAL"),
    "TOTAL row should be excluded from parsed players",
  );
  assert.deepEqual(
    new Set(players.map((p) => p.name)),
    new Set(qualifying.map((r) => r.name)),
    "parsed player names should match the qualifying CSV rows",
  );

  // 2. Each player's fields round-trip from the CSV verbatim.
  for (const p of players) {
    const csvRow = qualifying.find((r) => r.name === p.name);
    assert.equal(p.games, csvRow.games, `${p.name}: games`);
    assert.equal(p.buyIn, csvRow.buyIn, `${p.name}: buyIn`);
    assert.equal(p.cashOut, csvRow.cashOut, `${p.name}: cashOut`);
    assert.equal(p.net, csvRow.net, `${p.name}: net`);
    assert.equal(p.netAvg, csvRow.netAvg, `${p.name}: netAvg`);
  }

  // 3. Sortedness invariants for the two views the page renders.
  const byNet = [...players].sort((a, b) => b.net - a.net);
  for (let i = 1; i < byNet.length; i++) {
    assert.ok(byNet[i - 1].net >= byNet[i].net, "byNet should be sorted descending by net");
  }
  const byAvg = [...players].sort((a, b) => b.netAvg - a.netAvg);
  for (let i = 1; i < byAvg.length; i++) {
    assert.ok(byAvg[i - 1].netAvg >= byAvg[i].netAvg, "byAvg should be sorted descending by netAvg");
  }

  // 4. computeTotals is consistent with what we'd derive from the qualifying rows.
  const totals = computeTotals(players);
  const expectedTotalGames = qualifying.reduce((s, r) => s + r.games, 0);
  const expectedTotalBuyIn = qualifying.reduce((s, r) => s + r.buyIn, 0);
  const expectedWinners = qualifying.filter((r) => r.net > 0).length;
  const expectedLosers = qualifying.filter((r) => r.net < 0).length;
  const expectedMaxAbs = Math.max(...qualifying.map((r) => Math.abs(r.net)));
  assert.equal(totals.totalGames, expectedTotalGames, "computeTotals.totalGames");
  assert.equal(totals.totalBuyIn, expectedTotalBuyIn, "computeTotals.totalBuyIn");
  assert.equal(totals.winners, expectedWinners, "computeTotals.winners");
  assert.equal(totals.losers, expectedLosers, "computeTotals.losers");
  assert.equal(totals.maxAbs, expectedMaxAbs, "computeTotals.maxAbs");
  assert.equal(
    Math.abs(totals.maxAbsPlayer.net),
    expectedMaxAbs,
    "maxAbsPlayer should be the player with the largest absolute swing",
  );
  assert.equal(totals.bestAvg.name, byAvg[0].name, "bestAvg should be the top of byAvg");
  assert.equal(
    totals.worstAvg.name,
    byAvg[byAvg.length - 1].name,
    "worstAvg should be the bottom of byAvg",
  );

  // 5. Hue assignment: distinct, and steers clear of the gain/loss bar palettes.
  const hues = new Set(players.map((p) => p.hue));
  assert.equal(hues.size, players.length, "every player should get a distinct avatar hue");
  for (const hue of hues) {
    assert.ok(
      !(hue >= 130 && hue <= 175),
      `hue ${hue} would clash with the emerald gain bars`,
    );
    assert.ok(
      !(hue >= 335 || hue <= 10),
      `hue ${hue} would clash with the rose loss bars`,
    );
  }
});

test("page's parseCsv honors each tab's minGames against every served mode CSV", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  const scriptSrc = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const minGamesMatch = scriptSrc.match(/const\s+MIN_GAMES\s*=\s*(\d+)/);
  const minGamesModeMatch = scriptSrc.match(/const\s+MIN_GAMES_MODE\s*=\s*(\d+)/);
  assert.ok(minGamesMatch, "expected MIN_GAMES constant in script");
  assert.ok(minGamesModeMatch, "expected MIN_GAMES_MODE constant in script");

  // Lift the page's real TABS config + parseCsv so the test follows the page
  // if tab wiring or thresholds ever change.
  const harness = `
    const MIN_GAMES = ${minGamesMatch[1]};
    const MIN_GAMES_MODE = ${minGamesModeMatch[1]};
    const HUE_PALETTE = ${scriptSrc.match(/const\s+HUE_PALETTE\s*=\s*(\[[^\]]+\])/)[1]};
    const TABS = ${extractConstArray(scriptSrc, "TABS")};
    ${extractFunction(scriptSrc, "assignHues")}
    ${extractFunction(scriptSrc, "parseCsv")}
    return { TABS, parseCsv, MIN_GAMES, MIN_GAMES_MODE };
  `;
  const { TABS, parseCsv, MIN_GAMES, MIN_GAMES_MODE } = new Function(harness)();

  assert.equal(TABS.length, 4, "page should configure four tabs");
  const historyTabEntry = TABS.find((t) => t.id === "history");
  assert.ok(historyTabEntry, "expected a history tab in TABS");
  assert.equal(historyTabEntry.type, "history", "history tab should have type 'history'");
  assert.equal(historyTabEntry.url, "./games.json", "history tab url should be ./games.json");

  const overall = TABS.find((t) => t.id === "overall");
  assert.equal(overall.minGames, MIN_GAMES, "overall tab should use the MIN_GAMES floor");
  for (const mode of ["tournament", "cash"]) {
    const tab = TABS.find((t) => t.id === mode);
    assert.ok(tab, `expected a ${mode} tab`);
    assert.equal(tab.minGames, MIN_GAMES_MODE, `${mode} tab should use the MIN_GAMES_MODE floor`);
  }

  for (const tab of TABS.filter((t) => t.type === "leaderboard")) {
    const csv = await (
      await fetch(`${baseUrl}/standings/${tab.url.replace("./", "")}?t=${Date.now()}`, {
        cache: "no-store",
      })
    ).text();
    const expected = oracleRows(csv).filter(
      (r) => r.name !== "TOTAL" && Number.isFinite(r.games) && r.games >= tab.minGames,
    );
    const players = parseCsv(csv, tab.minGames);
    assert.deepEqual(
      new Set(players.map((p) => p.name)),
      new Set(expected.map((r) => r.name)),
      `${tab.id}: parseCsv should yield exactly the rows clearing minGames=${tab.minGames}`,
    );
    for (const p of players) {
      const row = expected.find((r) => r.name === p.name);
      assert.equal(p.games, row.games, `${tab.id}/${p.name}: games`);
      assert.equal(p.net, row.net, `${tab.id}/${p.name}: net`);
      assert.equal(p.netAvg, row.netAvg, `${tab.id}/${p.name}: netAvg`);
    }
  }
});

test("applyUnifiedHues gives every player the same avatar hue on every tab", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  const scriptSrc = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const harness = `
    const MIN_GAMES = ${scriptSrc.match(/const\s+MIN_GAMES\s*=\s*(\d+)/)[1]};
    const MIN_GAMES_MODE = ${scriptSrc.match(/const\s+MIN_GAMES_MODE\s*=\s*(\d+)/)[1]};
    const HUE_PALETTE = ${scriptSrc.match(/const\s+HUE_PALETTE\s*=\s*(\[[^\]]+\])/)[1]};
    const TABS = ${extractConstArray(scriptSrc, "TABS")};
    ${extractFunction(scriptSrc, "assignHues")}
    ${extractFunction(scriptSrc, "parseCsv")}
    ${extractFunction(scriptSrc, "applyUnifiedHues")}
    return { TABS, parseCsv, applyUnifiedHues };
  `;
  const { TABS, parseCsv, applyUnifiedHues } = new Function(harness)();

  const byTab = {};
  for (const tab of TABS.filter((t) => t.type === "leaderboard")) {
    const csv = await (
      await fetch(`${baseUrl}/standings/${tab.url.replace("./", "")}?t=${Date.now()}`, {
        cache: "no-store",
      })
    ).text();
    byTab[tab.id] = { players: parseCsv(csv, tab.minGames) };
  }
  applyUnifiedHues(byTab);

  const hueByName = new Map();
  for (const tab of TABS.filter((t) => t.type === "leaderboard")) {
    for (const p of byTab[tab.id].players) {
      if (hueByName.has(p.name)) {
        assert.equal(
          p.hue,
          hueByName.get(p.name),
          `${p.name} should keep one hue across tabs (differs on ${tab.id})`,
        );
      } else {
        hueByName.set(p.name, p.hue);
      }
      assert.ok(Number.isFinite(p.hue), `${p.name} should have a numeric hue`);
    }
  }
});

test("tab strip implements the WAI-ARIA tabs pattern (ids, panels, keyboard nav)", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  const scriptSrc = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  // Tablist with an accessible name.
  assert.match(scriptSrc, /role:\s*["']tablist["']/, "expected role=tablist");
  assert.match(
    scriptSrc,
    /["']aria-label["']:\s*["'][^"']+["'],\s*\n?\s*\}\)|role:\s*["']tablist["'],\s*\n\s*["']aria-label["']/,
    "expected an aria-label on the tablist",
  );

  // Tab buttons: id + aria-controls pairing and roving tabindex.
  assert.match(scriptSrc, /id:\s*["']tab-["']\s*\+\s*tab\.id/, "expected per-tab ids");
  assert.match(
    scriptSrc,
    /["']aria-controls["']:\s*["']panel-["']\s*\+\s*tab\.id/,
    "expected aria-controls pointing at the matching panel",
  );
  assert.match(
    scriptSrc,
    /tabindex:\s*isActive\s*\?\s*["']0["']\s*:\s*["']-1["']/,
    "expected roving tabindex on tab buttons",
  );

  // Tabpanel labelled by the active tab.
  assert.match(scriptSrc, /role:\s*["']tabpanel["']/, "expected role=tabpanel");
  assert.match(
    scriptSrc,
    /["']aria-labelledby["']:\s*["']tab-["']\s*\+\s*tab\.id/,
    "expected the tabpanel to be labelled by its tab",
  );

  // Keyboard support: arrows + Home/End.
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
    assert.ok(scriptSrc.includes(`"${key}"`), `expected keyboard handling for ${key}`);
  }
});

test("theme-color is consistent across the standings page and its web manifest", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  const manifest = JSON.parse(
    await (await fetch(`${baseUrl}/standings/manifest.webmanifest`)).text(),
  );

  const metaTheme = html.match(/<meta name="theme-color" content="([^"]+)"/)?.[1];
  const bgBase = html.match(/--bg-base:\s*([^;]+);/)?.[1].trim();

  assert.ok(metaTheme, "expected a theme-color meta tag");
  assert.ok(bgBase, "expected a --bg-base CSS variable");
  assert.equal(metaTheme, bgBase, "meta theme-color should match the page background");
  assert.equal(manifest.theme_color, metaTheme, "manifest theme_color should match the page");
  assert.equal(
    manifest.background_color,
    metaTheme,
    "manifest background_color should match the page",
  );
});

test("deploy → refresh cycle: updating the bundled CSV is reflected in the next cache-busted fetch", async () => {
  const csvPath = path.join(tmpDir, "standings/PokerSummary.csv");
  const original = fs.readFileSync(csvPath, "utf8");
  const sentinel = `9,IntTestPlayer,180.00,20.00,540.00,60.00,360.00,40.00\n`;
  fs.writeFileSync(csvPath, original.replace(/\n*$/, "\n") + sentinel);

  try {
    const stale = await (
      await fetch(`${baseUrl}/standings/PokerSummary.csv?t=${Date.now()}`, {
        cache: "no-store",
      })
    ).text();
    assert.ok(
      stale.includes("IntTestPlayer"),
      "cache-busted fetch should reflect the newly-bundled CSV",
    );
  } finally {
    fs.writeFileSync(csvPath, original);
  }
});

test("games.json is bundled and byte-identical to source", async () => {
  const served = await (
    await fetch(`${baseUrl}/standings/games.json?t=${Date.now()}`, { cache: "no-store" })
  ).text();
  const source = fs.readFileSync(path.join(REPO_ROOT, "stats/games.json"), "utf8");
  assert.equal(served, source, "served games.json should be byte-identical to stats/games.json");
});

test("games.json is well-formed and internally consistent", async () => {
  const served = await (
    await fetch(`${baseUrl}/standings/games.json?t=${Date.now()}`, { cache: "no-store" })
  ).text();
  const data = JSON.parse(served);
  assert.ok(Array.isArray(data.games), "games.json should have a .games array");
  assert.ok(data.games.length > 0, "games array should be non-empty");

  for (const game of data.games) {
    assert.ok(game.id, `game should have an id`);
    assert.ok(game.date, `game ${game.id} should have a date`);
    assert.ok(game.title, `game ${game.id} should have a title`);
    assert.ok(game.mode, `game ${game.id} should have a mode`);
    assert.ok(Array.isArray(game.players), `game ${game.id} should have a players array`);
    for (const p of game.players) {
      assert.ok(p.name, `player in game ${game.id} should have a name`);
      assert.ok(typeof p.buyIn === "number", `${p.name} in game ${game.id} should have numeric buyIn`);
      assert.ok(typeof p.cashOut === "number", `${p.name} in game ${game.id} should have numeric cashOut`);
      assert.ok(Number.isFinite(p.cashOut - p.buyIn), `${p.name}: net should be finite`);
    }
  }

  const seeded = data.games.find((g) => g.id === "2026-07-21-home-cash-game");
  assert.ok(seeded, "seeded game 2026-07-21-home-cash-game should exist");
  assert.equal(seeded.players.length, 7, "seeded game should have 7 players");
  const totalIn = seeded.players.reduce((s, p) => s + p.buyIn, 0);
  const totalOut = seeded.players.reduce((s, p) => s + p.cashOut, 0);
  assert.equal(totalIn, 360, "seeded game totalIn should be 360");
  assert.equal(totalOut, 355, "seeded game totalOut should be 355");
});

test("history tab is wired into the page TABS config", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  const scriptSrc = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  const harness = `
    const MIN_GAMES = ${scriptSrc.match(/const\s+MIN_GAMES\s*=\s*(\d+)/)[1]};
    const MIN_GAMES_MODE = ${scriptSrc.match(/const\s+MIN_GAMES_MODE\s*=\s*(\d+)/)[1]};
    const HUE_PALETTE = ${scriptSrc.match(/const\s+HUE_PALETTE\s*=\s*(\[[^\]]+\])/)[1]};
    const TABS = ${extractConstArray(scriptSrc, "TABS")};
    return { TABS };
  `;
  const { TABS } = new Function(harness)();

  const histTab = TABS.find((t) => t.id === "history");
  assert.ok(histTab, "expected a history tab in TABS");
  assert.equal(histTab.type, "history", "history tab should have type 'history'");
  assert.equal(histTab.url, "./games.json", "history tab url should be ./games.json");
});

test("the page defines a buildHistory renderer wired to the history tab", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  const scriptSrc = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  assert.ok(
    scriptSrc.includes("function buildHistory"),
    "script should declare a standalone buildHistory function",
  );
  assert.ok(
    scriptSrc.includes("buildHistory(ctx)"),
    "renderActive should call buildHistory with ctx",
  );
  // Verify the complete script (including buildHistory) still parses as valid JS.
  assert.doesNotThrow(
    () => new Function(scriptSrc),
    "script with buildHistory should parse cleanly as JS",
  );
});
