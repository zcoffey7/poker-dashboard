/**
 * Money helpers for the cash module.
 *
 * Canonical representation inside the cash store is INTEGER CENTS.
 * UI inputs (NumberInput) emit dollars as floats; use `toCents`/`fromCents`
 * at the store / render boundaries.
 */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Dollars (float) → integer cents. Non-finite inputs collapse to 0. */
export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

/** Integer cents → dollars (float) for display / NumberInput. */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
}

/** Format an integer-cents amount as USD. */
export function fmtMoneyCents(cents: number): string {
  if (!Number.isFinite(cents)) return "$0.00";
  return USD.format(cents / 100);
}

/** Format an integer-cents amount with an explicit sign ("+" / "−"). */
export function fmtSignedCents(cents: number): string {
  if (!Number.isFinite(cents) || cents === 0) return fmtMoneyCents(0);
  const sign = cents > 0 ? "+" : "−";
  return `${sign}${fmtMoneyCents(Math.abs(cents))}`;
}

/**
 * Legacy float-dollar formatter kept for backward compat. Always renders
 * exactly two decimal places via a locale-aware currency formatter.
 */
export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  return USD.format(n);
}

export function fmtSigned(n: number): string {
  if (!Number.isFinite(n) || n === 0) return fmtMoney(0);
  const sign = n > 0 ? "+" : "−";
  return `${sign}${fmtMoney(Math.abs(n))}`;
}
