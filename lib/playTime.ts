export type PlayInterval = {
  startedAt: number;
  /** Missing while the player is still seated. */
  endedAt?: number;
};

export function hasOpenInterval(
  intervals: PlayInterval[] | undefined,
): boolean {
  return (intervals ?? []).some((i) => i.endedAt == null);
}

/** Start a new stint unless one is already running. */
export function startPlay(
  intervals: PlayInterval[] | undefined,
  now: number,
): PlayInterval[] {
  const list = intervals ?? [];
  if (hasOpenInterval(list)) return list;
  return [...list, { startedAt: now }];
}

/** Close the current stint. No-op if the player isn't seated. */
export function stopPlay(
  intervals: PlayInterval[] | undefined,
  now: number,
): PlayInterval[] {
  const list = intervals ?? [];
  if (!hasOpenInterval(list)) return list;
  return list.map((i) => (i.endedAt == null ? { ...i, endedAt: now } : i));
}

export function playedMs(
  intervals: PlayInterval[] | undefined,
  now: number,
): number {
  let total = 0;
  for (const i of intervals ?? []) {
    const end = i.endedAt ?? now;
    total += Math.max(0, end - i.startedAt);
  }
  return total;
}

export function playedSec(
  intervals: PlayInterval[] | undefined,
  now: number,
): number {
  return Math.floor(playedMs(intervals, now) / 1000);
}

/**
 * Seconds played, or `null` when nothing has been recorded yet (player
 * added but the game hasn't started, etc.).
 */
export function playedSecOrNull(
  intervals: PlayInterval[] | undefined,
  now: number,
): number | null {
  if (intervals == null || intervals.length === 0) return null;
  return playedSec(intervals, now);
}

export function isPlaying(intervals: PlayInterval[] | undefined): boolean {
  return hasOpenInterval(intervals);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Live clock label.
 * < 1 hour  -> "MM:SS" so the seconds tick
 * >= 1 hour -> "1hr 10m" (never "70:00" or "1:10:00")
 */
export function fmtPlayedClock(totalSec: number): string {
  if (totalSec < 0) totalSec = 0;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return m > 0 ? `${h}hr ${m}m` : `${h}hr`;
  return `${pad2(m)}:${pad2(s)}`;
}

/** Backfill cash-game intervals from the timestamps that already exist. */
export function migrateCashIntervals(player: {
  buyIns?: { at: number }[];
  cashOut?: { at: number };
  playIntervals?: PlayInterval[];
}): PlayInterval[] {
  if (player.playIntervals && player.playIntervals.length > 0) {
    return player.playIntervals;
  }
  const start = player.buyIns?.[0]?.at;
  if (start == null) return [];
  return [{ startedAt: start, endedAt: player.cashOut?.at }];
}

/** Backfill tournament intervals from start / elimination / finish times. */
export function migrateTournamentIntervals(
  player: {
    eliminatedAt?: number;
    playIntervals?: PlayInterval[];
  },
  startedAt?: number,
  finishedAt?: number,
): PlayInterval[] {
  if (player.playIntervals && player.playIntervals.length > 0) {
    return player.playIntervals;
  }
  if (startedAt == null) return [];
  return [
    {
      startedAt,
      endedAt: player.eliminatedAt ?? finishedAt,
    },
  ];
}
