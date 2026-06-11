import type { PayoutSpot } from "./types";

export const CASH_INCREMENT = 5;

/** Floor `n` to the nearest multiple of `step`. */
export function floorTo(n: number, step: number) {
  return Math.floor(n / step) * step;
}

/**
 * Convert percentage-based chop shares into cash-friendly dollar amounts.
 * Mirrors `computeCashPayouts`: every share after the first is floored to
 * the increment, and rounding dust goes to the first entry.
 */
export function computeChopAmounts(
  shares: Record<string, number>,
  pool: number,
  increment = CASH_INCREMENT,
): Record<string, number> {
  const entries = Object.entries(shares);
  if (entries.length === 0 || pool <= 0) return {};
  const totalPct = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const poolFloored = floorTo(pool, increment);
  const amounts: Record<string, number> = {};
  let allocated = 0;
  entries.forEach(([id, pct], idx) => {
    if (idx === 0) return;
    const raw = (pct / totalPct) * poolFloored;
    const amt = Math.max(0, floorTo(raw, increment));
    amounts[id] = amt;
    allocated += amt;
  });
  amounts[entries[0][0]] = Math.max(0, poolFloored - allocated);
  return amounts;
}

/**
 * Compute payouts in cash-friendly increments (multiples of $5).
 * Each spot is floored to the nearest $5 and any remainder is given to 1st place
 * so the sum always matches the prize pool exactly (when pool itself is a $5 multiple).
 *
 * If the pool isn't a $5 multiple, the pool itself is floored first and the
 * "lost" cents/dollars are returned as `remainder` (informational only).
 *
 * `maxPaidSpots` (optional) caps how many payout rows actually receive money,
 * for cases where fewer players finished than there are configured payout
 * spots. Rows beyond the cap are set to 0; any pool that would've gone to
 * those rows is folded back into 1st place as dust.
 */
export function computeCashPayouts(
  payouts: PayoutSpot[],
  pool: number,
  maxPaidSpots?: number,
  increment = CASH_INCREMENT,
): { amounts: Record<number, number>; paidTotal: number; remainder: number } {
  const amounts: Record<number, number> = {};
  if (payouts.length === 0 || pool <= 0) {
    payouts.forEach((p) => (amounts[p.place] = 0));
    return { amounts, paidTotal: 0, remainder: pool };
  }

  const sorted = [...payouts].sort((a, b) => a.place - b.place);
  const cap =
    maxPaidSpots != null ? Math.max(0, Math.min(maxPaidSpots, sorted.length)) : sorted.length;
  const paidSlice = sorted.slice(0, cap);
  const unpaidSlice = sorted.slice(cap);

  // Zero out any capped-off rows so callers always get a defined value.
  unpaidSlice.forEach((p) => (amounts[p.place] = 0));

  if (cap === 0) {
    return { amounts, paidTotal: 0, remainder: pool };
  }

  const totalPct = paidSlice.reduce((s, p) => s + p.percent, 0) || 1;
  const poolFloored = floorTo(pool, increment);

  let allocated = 0;
  paidSlice.forEach((p, idx) => {
    if (idx === 0) return;
    const raw = (p.percent / totalPct) * poolFloored;
    const amt = Math.max(0, floorTo(raw, increment));
    amounts[p.place] = amt;
    allocated += amt;
  });

  // Dust from $5 rounding is assigned to 1st place by design.
  const first = paidSlice[0];
  const firstAmt = Math.max(0, poolFloored - allocated);
  amounts[first.place] = firstAmt;

  const paidTotal = allocated + firstAmt;
  return { amounts, paidTotal, remainder: pool - paidTotal };
}
