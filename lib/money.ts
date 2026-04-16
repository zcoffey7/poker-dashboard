/**
 * Format a dollar amount. Shows cents when non-integer, otherwise whole dollars
 * with thousands separators. Always prefixed with $.
 */
export function fmtMoney(n: number): string {
  const isWhole = Math.abs(n - Math.round(n)) < 0.005;
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `$${formatted}`;
}

export function fmtSigned(n: number): string {
  if (n === 0) return fmtMoney(0);
  const sign = n > 0 ? "+" : "−";
  return `${sign}${fmtMoney(Math.abs(n))}`;
}
