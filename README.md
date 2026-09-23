# PokerClock

A static home-game dashboard for running **tournaments** and **cash games**, plus a deployable **season standings** page. Built with Next.js (static export), React, Zustand, and Tailwind CSS.

## Features

- **Tournament mode** — blind clock with sound warnings, table seating and auto-balance, rebuys/add-ons, payout structure, finish/chop flow, and end-of-game recap
- **Cash game mode** — per-player buy-ins and rebuys, individual cash-outs, end-game settlement with balance check, and recap
- **Standings** — cumulative stats from `stats/PokerSummary.csv`, bundled as a standalone PWA at `/standings/`
- **Phone-first UI** — bottom sheets that stay above the on-screen keyboard, sticky thumb-reach action bars, and three color themes (Felt, Midnight, Daylight) from the palette button

State persists in the browser via Zustand + `localStorage`. There is no backend.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run test       # unit + integration
npm run build      # static export → out/
npm run start      # serve out/ locally (npx serve)
```

### Scripts

| Script | Purpose |
|--------|---------|
| `dev` | Next.js dev server |
| `build` | Static export to `out/` |
| `start` | Serve the static export |
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `test` | Unit tests (`lib/`) + standings integration test |
| `test:unit` | `node --test` on `lib/*.test.ts` |
| `test:integration` | Headless checks against the standings bundle |

## Deployment

The app is a **static export** (`output: "export"` in `next.config.ts`), deployed to **GitHub Pages** via `.github/workflows/deploy.yml`.

On GitHub Pages the app is served under a repository subpath. CI sets `NEXT_PUBLIC_BASE_PATH` (e.g. `/poker-dashboard`) so asset URLs resolve correctly.

Pull requests run `.github/workflows/ci.yml` (lint, typecheck, tests, build).

## Standings data

Season totals live in `stats/PokerSummary.csv`. The standings page (`stats/poker-summary.html`) is copied into the export at build time. Update the CSV after each game night to keep the public standings current.

## Project layout

```
app/           Next.js routes (tournament, cash, standings redirect)
components/    UI for tournament, cash, and shared widgets
lib/           Store logic, selectors, payouts, seating, money helpers
stats/         Standings HTML/CSS/CSV and PWA manifest
scripts/       Integration tests
```

## Tech notes

- Geist Sans / Mono come from the `geist` package (self-hosted through `next/font/local`, so builds need no network)
- Every color is a CSS variable in `app/globals.css`; a theme is a `[data-theme]` block, applied before first paint by the boot script in `app/layout.tsx`
- Component classes (`.btn`, `.input`, `.card`, …) live in `@layer components`, so Tailwind utilities override them without `!important`
- Confirmations use the in-app `confirmAction()` dialog (`lib/confirm.ts`) instead of `window.confirm`, which would freeze the blind clock while open
- Money in the cash module is stored as **integer cents** internally; UI inputs are dollars
- Tournament blind levels carry stable `id` fields so the structure editor survives reorder without losing row state
