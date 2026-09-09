---
name: update-poker-standings
description: >-
  Updates the cumulative poker standings in `stats/PokerSummary.csv` with results
  from a new game session, and appends the session to `stats/games.json` for the
  History tab. Use when the user provides results from a poker night (via screenshot,
  image, table, or pasted text) and wants to add the session to the running totals
  — recalculating games played, total/average buy-in, total/average cash out, net,
  and net per game for each player, then re-sorting and updating the TOTAL row.
  Trigger phrases include "update standings", "update the sheet", "add this game",
  "new poker session", or any reference to `PokerSummary.csv`.
---

# Update Poker Standings

## Files

The cumulative standings live in **three** CSVs, each with the same columns:

```
Games,Player,Total Buy-In,Avg Buy-In,Total Cash Out,Avg Cash Out,Net,Net per Game
```

- `stats/PokerSummary.csv` — **Overall**. The rolling totals across every session in every mode. Has been the single source of truth historically and continues to receive every session going forward. Backs the "Overall" tab on the standings page.
- `stats/PokerTournamentSummary.csv` — **Tournament only**. Started fresh and accumulates one row per tournament session. Backs the "Tournament" tab.
- `stats/PokerCashSummary.csv` — **Cash only**. Started fresh and accumulates one row per cash session. Backs the "Cash Game" tab.

Shared rules for every CSV:

- All monetary columns are formatted to **2 decimal places** (e.g. `40.00`, `-18.04`).
- The final row is a `TOTAL` row where `Games` is the sum of player-game appearances (not session count), `Total Buy-In` / `Total Cash Out` / `Net` are summed across all players, and the `Avg` and `Net per Game` columns are left blank.
- Rows are sorted by `Net` **descending** (highest winnings first, deepest losses last). The `TOTAL` row stays at the bottom.
- An empty CSV still has the header row plus a zeroed `0,TOTAL,0.00,,0.00,,0.00,` row. Never delete the TOTAL row.

Session history lives in **`stats/games.json`**, which backs the **History** tab on the standings page. Shape:

```json
{
  "games": [
    {
      "id": "2026-07-27-home-cash-game",
      "date": "2026-07-27",
      "title": "Home Cash Game",
      "mode": "cash",
      "durationMinutes": 160,
      "players": [
        { "name": "John", "buyIn": 40, "cashOut": 100, "buyIns": 1 }
      ]
    }
  ]
}
```

- `games` is an array ordered **most recent first** (prepend each new session).
- `id` is `{YYYY-MM-DD}-{kebab-case-title}` (e.g. `home-cash-game`). If that id already exists, append `-2`, `-3`, etc.
- `date` is `YYYY-MM-DD`. Use the date shown in the screenshot; if absent, use today's date from user context.
- `title` comes from the screenshot (e.g. `"Home Cash Game"`).
- `mode` is `"cash"` or `"tournament"` — must match the per-mode CSV you update.
- `durationMinutes` is optional but preferred when the screenshot shows session length (e.g. `2h 40m` → `160`).
- Each player object: `name` (canonical alias), `buyIn` and `cashOut` as **whole-dollar numbers** (no decimals — `40`, not `40.00`), and `buyIns` (integer count from the `Nx` badge; default `1` if not shown).

## Relationship to the in-app "Update Sheet" button

The recap screen can publish a finished game directly from the phone, using the
same arithmetic ported to `lib/standings/`. Use this skill when the results
arrive as a screenshot or pasted text (a session that was never tracked in the
app), or when a published session needs correcting. If both are changed, keep
the rules here and the code in `lib/standings/` in step.

## Which files to update for a session

Every session is one of the two game modes. For each session, you must update **three** files:

1. `stats/PokerSummary.csv` (Overall — every session, no exceptions).
2. EITHER `stats/PokerTournamentSummary.csv` OR `stats/PokerCashSummary.csv`, depending on the mode.
3. `stats/games.json` (History tab — every session, no exceptions).

If the user did not say which mode the session was, ask them with `AskQuestion` before editing. Default convention if obvious from context (e.g. screenshot is from the tournament mode of the app, or the user said "tournament results"): use it but mention the assumption in the summary.

## Workflow

Follow these steps every time:

### 1. Extract the session data

The user will provide a session as a screenshot, image, table, or text. Extract one row per player with:

- Player name (apply the **player aliases** below before writing)
- Buy-in (number)
- Cash out (number, may be blank)
- Buy-in count / rebuys (the `Nx` badge; default `1`)
- Net (may be blank — used only as a cross-check)

Also extract session-level fields for `games.json`:

- Title (e.g. `"Home Cash Game"`)
- Date (`YYYY-MM-DD`, if visible)
- Mode (`cash` or `tournament`)
- Duration (convert to `durationMinutes` when shown, e.g. `1h 53m` → `113`)

**Player aliases — apply silently, do not ask.** The same table is implemented
in `lib/standings/aliases.ts`, which backs the in-app "Update Sheet" button;
change both together.

| Alias seen in screenshots/sheets | Canonical name to write in the CSV |
|---|---|
| `Noble` | `Ham` |
| `ChristopherTobyTobin` | `Toby` |
| `Chris` | `Toby` |
| `Me` (when typed by the user) | `Coffey` |
| `Hounsell` | `Xander` |
| `Kyle` | `Martell` |

If any *new* unrecognized name appears, ask with `AskQuestion` whether it's a new player or an alias for an existing one before writing. Add confirmed aliases to this table.

### 2. Clarify ambiguities BEFORE editing

If the image looks cut off, ask whether there are more rows. Use the `AskQuestion` tool with explicit options rather than freeform follow-up.

If the **game mode** (Tournament vs Cash) isn't obvious from context, ask once with `AskQuestion`. Don't guess — the per-mode CSV you write to depends on this answer.

**Default convention for blank cash out**: treat it as `0` (player busted). This matches the existing data pattern where players like Souse and Toby show `-buy-in` as their net. Still confirm with the user once per session if any row has both a blank cash out *and* a blank net column, since that could also mean "still playing / not finalized".

If a row has a non-blank Net, verify it equals `cash_out - buy_in` and surface the discrepancy if not.

### 3. Read the current files

Always read all target files fresh before editing — do not rely on memory of previous values:

- `stats/PokerSummary.csv` (always).
- `stats/PokerTournamentSummary.csv` OR `stats/PokerCashSummary.csv` (the one matching the session's mode).
- `stats/games.json` (always).

### 4. Recalculate per-player totals

Apply this update to **each** of the two target CSVs independently (same arithmetic, different starting rows). For each player in the new session:

- If the player already exists in the CSV:
  - `Games          += 1`
  - `Total Buy-In   += session_buy_in`
  - `Total Cash Out += session_cash_out`  (use 0 if blank)
  - `Avg Buy-In      = Total Buy-In / Games`
  - `Avg Cash Out    = Total Cash Out / Games`
  - `Net             = Total Cash Out - Total Buy-In`
  - `Net per Game    = Net / Games`
- If the player is new to that CSV, add a new row with `Games = 1` and the session values directly (avg equals total, net per game equals net). Note that a player who has been around for months may still be "new" to the per-mode CSV the first time they play that mode.

Players not in this session keep their existing row unchanged.

### 5. Recalculate the TOTAL row

Apply this to **each** target CSV. The TOTAL row in Overall and the TOTAL row in the per-mode CSV are independent — they both increase by the same delta (one session's worth of player-games, buy-ins, cash-outs) but they start from different baselines.

- `Games` (TOTAL) = previous Games (TOTAL) + number of distinct players in this session
- `Total Buy-In` (TOTAL) = sum of every player row's `Total Buy-In`
- `Total Cash Out` (TOTAL) = sum of every player row's `Total Cash Out`
- `Net` (TOTAL) = `Total Cash Out (TOTAL) - Total Buy-In (TOTAL)`
- The `Avg Buy-In`, `Avg Cash Out`, and `Net per Game` cells in the TOTAL row stay **blank**.

### 6. Re-sort by Net descending

Sort every player row by `Net` descending in **each** target CSV. Keep the header row at the top and the `TOTAL` row at the bottom.

### 7. Run sanity checks

Before writing, verify all of the following — once for **each** target CSV. If any fail, stop and surface the discrepancy to the user.

- Session buy-in total equals session cash-out total (a balanced session). If they don't match, mention it — it usually means a missing cash-out or a typo.
- Sum of every player row's `Net` equals the TOTAL row's `Net`.
- Sum of every player row's `Total Buy-In` equals the TOTAL row's `Total Buy-In`.
- Sum of every player row's `Total Cash Out` equals the TOTAL row's `Total Cash Out`.
- The TOTAL row's `Games` equals the sum of every player row's `Games`.

Cross-CSV check (just one): the **delta** added to Overall's TOTAL row this session must equal the delta added to the per-mode CSV's TOTAL row. They both received the same session, so games / buy-in / cash-out / net deltas must match.

### 8. Append the session to `games.json`

Build a new game object from the extracted session data:

- `id`, `date`, `title`, `mode`, and optional `durationMinutes` as described above.
- `players`: one object per player with canonical `name`, whole-dollar `buyIn` / `cashOut`, and `buyIns`.

Before writing, verify:

- Sum of player `buyIn` equals sum of player `cashOut` (same balanced-session check as the CSVs).
- `mode` matches the per-mode CSV you updated.
- Player names and amounts match what you wrote into the CSVs (CSVs use 2-decimal strings; `games.json` uses whole-dollar numbers).

**Prepend** the new object to the `games` array (most recent first). Do not remove or reorder existing entries unless correcting a mistake. Preserve 2-space JSON indentation and a trailing newline.

### 9. Write the files

Overwrite all three target files:

- `stats/PokerSummary.csv` (always).
- `stats/PokerTournamentSummary.csv` OR `stats/PokerCashSummary.csv` (matching mode).
- `stats/games.json` (always).

For CSVs: preserve the exact column order, header text, 2-decimal formatting, and trailing newline.

### 10. Run the integration test

The repository ships an automated backstop at `scripts/standings-integration.test.mjs` that bundles the standings page exactly the way the deploy workflow does, serves it over HTTP, then runs the page's own `parseCsv` / `computeTotals` / `assignHues` against the bundled CSVs. It covers all three CSVs: it reasserts the TOTAL-row arithmetic invariants from step 7 against `PokerSummary.csv`, `PokerTournamentSummary.csv`, and `PokerCashSummary.csv`, validates `games.json` shape and consistency, and checks that the live page can still parse every row.

Always run it after writing:

```bash
npm run test:integration
```

If it fails:
- Read the assertion message. The most common failures after a standings update are TOTAL-row arithmetic mismatches (revisit step 5) or a malformed row that breaks `parseCsv` (check 2-decimal formatting and that the row has all 8 columns).
- Fix the CSV and re-run until the test passes. Do **not** declare the update done while the test is red.

### 11. Summarise the changes

After writing **and after the integration test passes**, post a short summary to the user that includes:

- Which mode the session was (Tournament or Cash), and therefore which files were updated (`PokerSummary.csv`, the per-mode CSV, and `games.json`).
- A table of every player who played this session, showing `Games` (before → after) and `Net` (before → after) — Overall side, since that's what most history tracking refers to.
- New cumulative totals for **both** updated CSVs: player-game appearances, total buy-in, total cash out, net.
- Confirmation that the session was added to the History tab (`games.json` id and date).
- Which sanity checks passed and that `npm run test:integration` is green.

## Rounding

Round to **2 decimal places** using standard rounding (e.g. `66.2963 → 66.30`). Do this only on the displayed/written values — keep full precision in any intermediate calculations to avoid drift.

## Example

For the prior session `Ham 20→55, Vallis 20→0, Mercer 40→95, Coffey 40→80, Randell 40→125, Souse 60→0, Brods 60→0, Xander 40→20, Toby 55→0`:

- Session buy-in total: `20+20+40+40+40+60+60+40+55 = 375`
- Session cash-out total: `55+0+95+80+125+0+0+20+0 = 375` ✓ balanced
- Session net sum: `0` ✓

Ham (previously `23 games, 875.00, 38.04, 460.00, 20.00, -415.00, -18.04`) becomes:

```
24,Ham,895.00,37.29,515.00,21.46,-380.00,-15.83
```

## Anti-patterns

- Do not skip the sanity checks — they catch transcription errors from screenshots.
- Do not skip `npm run test:integration` after writing. It is the automated backstop and replicates the deploy pipeline.
- Do not treat the TOTAL row's `Games` as a session counter; it is the sum of player appearances.
- Do not silently treat ambiguous blank rows as `0` if both `cash out` and `net` are blank — clarify first.
- Do not write integer monetary values (`40`); always write 2 decimals (`40.00`).
- Do not preserve the prior row order; always re-sort by `Net` descending after updating.
- **Do not forget the per-mode CSV.** Every session updates three files (Overall + the matching Tournament/Cash CSV + `games.json`). Updating only Overall would leave the per-mode tab silently stale.
- **Do not forget `games.json`.** Every session must be prepended to the History tab. Updating only the CSVs leaves session history incomplete.
- Do not write the session into the wrong per-mode CSV. If unsure about Tournament vs Cash, ask the user.
- Do not delete the `0,TOTAL,0.00,,0.00,,0.00,` row from a still-empty per-mode CSV. The integration test requires a TOTAL row in every CSV.
- Do not use 2-decimal strings in `games.json` monetary fields — whole-dollar numbers only (`40`, not `40.00`).
