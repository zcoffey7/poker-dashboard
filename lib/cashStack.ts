import type { CashPlayer } from "./cashTypes";

function buyInTotal(player: CashPlayer): number {
  return player.buyIns.reduce((sum, b) => sum + b.amount, 0);
}

/** Current stack in cents: buy-ins for active players, final cash-out when settled. */
export function playerStackCents(player: CashPlayer): number {
  if (player.cashOut) return player.cashOut.amount;
  return buyInTotal(player);
}

/** Mean stack across players. Active-only during live play; all players at recap. */
export function avgStackCents(
  players: readonly CashPlayer[],
  opts: { activeOnly?: boolean } = {},
): number | null {
  const pool = opts.activeOnly
    ? players.filter((p) => !p.cashOut)
    : players;
  if (pool.length === 0) return null;
  const sum = pool.reduce((s, p) => s + playerStackCents(p), 0);
  return sum / pool.length;
}

export function stackBB(stackCents: number, bigBlindCents: number): number {
  if (bigBlindCents <= 0) return 0;
  return stackCents / bigBlindCents;
}

/** Human-readable BB count (e.g. "125 BB", "87.5 BB"). */
export function fmtBBCount(bb: number): string {
  if (!Number.isFinite(bb)) return "—";
  const abs = Math.abs(bb);
  const rounded =
    abs >= 100 ? Math.round(abs) : Math.round(abs * 10) / 10;
  const text =
    Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} BB`;
}
