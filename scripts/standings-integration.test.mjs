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
  { src: "stats/manifest.webmanifest", dst: "standings/manifest.webmanifest" },
  { src: "stats/standings-icon-180.png", dst: "standings/standings-icon-180.png" },
  { src: "stats/standings-icon-192.png", dst: "standings/standings-icon-192.png" },
  { src: "stats/standings-icon-512.png", dst: "standings/standings-icon-512.png" },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
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

test("page references CSV via relative path + cache-busting + cache: no-store", async () => {
  const html = await (await fetch(`${baseUrl}/standings/`)).text();
  assert.match(html, /const\s+DATA_URL\s*=\s*["']\.\/PokerSummary\.csv["']/);
  assert.match(
    html,
    /\$\{DATA_URL\}\?t=\$\{Date\.now\(\)\}/,
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
  const players = parseCsv(csv);

  assert.equal(players.length, 10, "expected 10 qualifying players (>= 5 sessions, excluding TOTAL row)");

  const byNet = [...players].sort((a, b) => b.net - a.net);
  assert.equal(byNet[0].name, "Coffey", "top of Net P/L by total");
  assert.equal(byNet.at(-1).name, "Randell", "bottom of Net P/L by total");

  const byAvg = [...players].sort((a, b) => b.netAvg - a.netAvg);
  assert.equal(byAvg[0].name, "Coffey", "top of Per-Session Performance (highest Net/g)");
  assert.equal(byAvg.at(-1).name, "Brods", "bottom of Per-Session Performance (lowest Net/g)");

  const totals = computeTotals(players);
  assert.equal(totals.winners, 5);
  assert.equal(totals.losers, 5);
  assert.equal(totals.totalGames, 178);
  assert.equal(totals.totalBuyIn, 8090);
  assert.equal(totals.bestAvg.name, "Coffey");
  assert.equal(totals.worstAvg.name, "Brods");
  assert.equal(totals.maxAbsPlayer.name, "Coffey", "Coffey holds the largest absolute swing ($485)");

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
