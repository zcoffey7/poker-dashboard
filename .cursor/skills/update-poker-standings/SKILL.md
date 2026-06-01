---
name: update-poker-standings
description: >-
  Updates the cumulative poker standings in `stats/PokerSummary.csv` with results
  from a new game session. Use when the user provides results from a poker night
  (via screenshot, image, table, or pasted text) and wants to add the session to
  the running totals — recalculating games played, total/average buy-in, total/average
  cash out, net, and net per game for each player, then re-sorting and updating
  the TOTAL row. Trigger phrases include "update standings", "update the sheet",
  "add this game", "new poker session", or any reference to `PokerSummary.csv`.
---

# Update Poker Standings

## File

The cumulative standings live in `stats/PokerSummary.csv`. Columns (in order):

```
Games,Player,Total Buy-In,Avg Buy-In,Total Cash Out,Avg Cash Out,Net,Net per Game
```

- All monetary columns are formatted to **2 decimal places** (e.g. `40.00`, `-18.04`).
- The final row is a `TOTAL` row where `Games` is the sum of player-game appearances (not session count), `Total Buy-In` / `Total Cash Out` / `Net` are summed across all players, and the `Avg` and `Net per Game` columns are left blank.
- Rows are sorted by `Net` **descending** (highest winnings first, deepest losses last). The `TOTAL` row stays at the bottom.

## Workflow

Follow these steps every time:

### 1. Extract the session data

The user will provide a session as a screenshot, image, table, or text. Extract one row per player with:

- Player name
- Buy-in (number)
- Cash out (number, may be blank)
- Net (may be blank — used only as a cross-check)

### 2. Clarify ambiguities BEFORE editing

If the image looks cut off, ask whether there are more rows. Use the `AskQuestion` tool with explicit options rather than freeform follow-up.

**Default convention for blank cash out**: treat it as `0` (player busted). This matches the existing data pattern where players like Souse and Toby show `-buy-in` as their net. Still confirm with the user once per session if any row has both a blank cash out *and* a blank net column, since that could also mean "still playing / not finalized".

If a row has a non-blank Net, verify it equals `cash_out - buy_in` and surface the discrepancy if not.

### 3. Read the current CSV

Always read `stats/PokerSummary.csv` fresh before editing — do not rely on memory of previous values.

### 4. Recalculate per-player totals

For each player in the new session:

- If the player already exists in the CSV:
  - `Games          += 1`
  - `Total Buy-In   += session_buy_in`
  - `Total Cash Out += session_cash_out`  (use 0 if blank)
  - `Avg Buy-In      = Total Buy-In / Games`
  - `Avg Cash Out    = Total Cash Out / Games`
  - `Net             = Total Cash Out - Total Buy-In`
  - `Net per Game    = Net / Games`
- If the player is new, add a new row with `Games = 1` and the session values directly (avg equals total, net per game equals net).

Players not in this session keep their existing row unchanged.

### 5. Recalculate the TOTAL row

- `Games` (TOTAL) = previous Games (TOTAL) + number of distinct players in this session
- `Total Buy-In` (TOTAL) = sum of every player row's `Total Buy-In`
- `Total Cash Out` (TOTAL) = sum of every player row's `Total Cash Out`
- `Net` (TOTAL) = `Total Cash Out (TOTAL) - Total Buy-In (TOTAL)`
- The `Avg Buy-In`, `Avg Cash Out`, and `Net per Game` cells in the TOTAL row stay **blank**.

### 6. Re-sort by Net descending

Sort every player row by `Net` descending. Keep the header row at the top and the `TOTAL` row at the bottom.

### 7. Run sanity checks

Before writing, verify all of the following. If any fail, stop and surface the discrepancy to the user.

- Session buy-in total equals session cash-out total (a balanced session). If they don't match, mention it — it usually means a missing cash-out or a typo.
- Sum of every player row's `Net` equals the TOTAL row's `Net`.
- Sum of every player row's `Total Buy-In` equals the TOTAL row's `Total Buy-In`.
- Sum of every player row's `Total Cash Out` equals the TOTAL row's `Total Cash Out`.
- The TOTAL row's `Games` equals the sum of every player row's `Games`.

### 8. Write the CSV

Overwrite `stats/PokerSummary.csv` with the new contents. Preserve the exact column order, header text, 2-decimal formatting, and trailing newline.

### 9. Run the integration test

The repository ships an automated backstop at `scripts/standings-integration.test.mjs` that bundles the standings page exactly the way the deploy workflow does, serves it over HTTP, then runs the page's own `parseCsv` / `computeTotals` / `assignHues` against the new CSV. Crucially, it also reasserts the same TOTAL-row arithmetic invariants from step 7, the `Net`-descending sort order, and that the live page can still parse every row.

Always run it after writing:

```bash
npm run test:integration
```

If it fails:
- Read the assertion message. The most common failures after a standings update are TOTAL-row arithmetic mismatches (revisit step 5) or a malformed row that breaks `parseCsv` (check 2-decimal formatting and that the row has all 8 columns).
- Fix the CSV and re-run until the test passes. Do **not** declare the update done while the test is red.

### 10. Summarise the changes

After writing **and after the integration test passes**, post a short summary to the user that includes:

- A table of every player who played this session, showing `Games` (before → after) and `Net` (before → after).
- New cumulative totals: player-game appearances, total buy-in, total cash out, net.
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
