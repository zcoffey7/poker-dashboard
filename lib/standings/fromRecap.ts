import { canonicalName } from "./aliases";
import type { GameMode, SessionDraft, SessionPlayer } from "./types";

/** Local calendar date as YYYY-MM-DD (the sheet records the night, not UTC). */
export function localDateString(ts: number = Date.now()): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** The sheet is kept in whole dollars; the cash store works in cents. */
export function dollarsFromCents(cents: number): number {
  return Math.round(cents / 100);
}

export function durationMinutes(
  startedAt?: number,
  endedAt?: number,
): number | undefined {
  if (!startedAt || !endedAt || endedAt <= startedAt) return undefined;
  const minutes = Math.round((endedAt - startedAt) / 60000);
  return minutes > 0 ? minutes : undefined;
}

/**
 * Turn a recap's already-computed rows into a session draft. Both recaps pass
 * their own rows in so the payout maths stays in one place per mode and can't
 * drift from what the user just read on screen.
 */
export function buildSessionDraft(args: {
  title: string;
  mode: GameMode;
  startedAt?: number;
  endedAt?: number;
  rows: readonly SessionPlayer[];
}): SessionDraft {
  const minutes = durationMinutes(args.startedAt, args.endedAt);
  return {
    date: localDateString(args.endedAt ?? Date.now()),
    title: args.title.trim() || "Home Game",
    mode: args.mode,
    ...(minutes != null ? { durationMinutes: minutes } : {}),
    players: args.rows.map((r) => ({
      name: canonicalName(r.name),
      buyIn: Math.round(r.buyIn),
      cashOut: Math.round(r.cashOut),
      buyIns: Math.max(1, Math.round(r.buyIns)),
    })),
  };
}
