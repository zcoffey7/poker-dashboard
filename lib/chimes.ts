import type { BlindLevel, ClockState } from "./types";

export type ChimeKind = "warning" | "levelUp";

export type Chime = {
  kind: ChimeKind;
  /** Wall-clock time (epoch ms) the chime starts. */
  at: number;
};

/**
 * Every chime still ahead of a running clock, in order: a warning `warnSec`
 * before each level ends and a level-up as it ends, through the last level.
 *
 * Levels chain off `levelStartedAt` by wall clock exactly as the store's
 * `tick` / `reconcileClock` roll them, so each chime lands on the instant the
 * dashboard changes level — including while the page is hidden and the tick
 * is throttled.
 */
export function upcomingChimes(
  clock: ClockState,
  structure: BlindLevel[],
  warnSec: number,
  now: number,
): Chime[] {
  if (!clock.running) return [];
  const current = structure[clock.currentLevel];
  if (!current) return [];

  let start =
    clock.levelStartedAt ??
    now - (current.durationSec - clock.remainingSec) * 1000;
  if (start > now) start = now;

  const chimes: Chime[] = [];
  for (let i = clock.currentLevel; i < structure.length; i++) {
    const { durationSec } = structure[i];
    const end = start + durationSec * 1000;
    // The warning marks the countdown passing `warnSec`, so a level that
    // starts inside that window never gets one.
    if (warnSec > 0 && durationSec > warnSec) {
      const warnAt = end - warnSec * 1000;
      if (warnAt > now) chimes.push({ kind: "warning", at: warnAt });
    }
    // Zero-length levels end on the same instant and roll as one.
    const last = chimes[chimes.length - 1];
    if (end > now && !(last?.kind === "levelUp" && last.at === end)) {
      chimes.push({ kind: "levelUp", at: end });
    }
    start = end;
  }
  return chimes;
}
