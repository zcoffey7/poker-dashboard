import type { StandingsCsv, StandingsRow } from "./types";

export const STANDINGS_HEADER =
  "Games,Player,Total Buy-In,Avg Buy-In,Total Cash Out,Avg Cash Out,Net,Net per Game";

export const TOTAL_PLAYER = "TOTAL";

/**
 * Two-decimal money string. Delegates to `toFixed` rather than rounding by
 * hand: `Math.round` breaks ties toward +Infinity, so it would render
 * -18.035 as -18.03 where every value already committed to the CSVs rounds
 * away from zero (-18.04).
 */
export function money(n: number): string {
  const text = n.toFixed(2);
  return text === "-0.00" ? "0.00" : text;
}

export function net(row: StandingsRow): number {
  return row.totalCashOut - row.totalBuyIn;
}

function avg(total: number, games: number): number {
  return games === 0 ? 0 : total / games;
}

export function parseStandingsCsv(text: string): StandingsCsv {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const header = lines[0]?.trim() ? lines[0] : STANDINGS_HEADER;
  const rows: StandingsRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < 8) continue;
    const player = cols[1];
    if (!player || player === TOTAL_PLAYER) continue;
    const games = Number.parseInt(cols[0], 10);
    if (!Number.isFinite(games)) continue;
    rows.push({
      games,
      player,
      totalBuyIn: Number.parseFloat(cols[2]) || 0,
      totalCashOut: Number.parseFloat(cols[4]) || 0,
    });
  }
  return { header, rows };
}

function formatRow(row: StandingsRow): string {
  const rowNet = net(row);
  return [
    String(row.games),
    row.player,
    money(row.totalBuyIn),
    money(avg(row.totalBuyIn, row.games)),
    money(row.totalCashOut),
    money(avg(row.totalCashOut, row.games)),
    money(rowNet),
    money(avg(rowNet, row.games)),
  ].join(",");
}

function formatTotalRow(rows: readonly StandingsRow[]): string {
  const games = rows.reduce((s, r) => s + r.games, 0);
  const buyIn = rows.reduce((s, r) => s + r.totalBuyIn, 0);
  const cashOut = rows.reduce((s, r) => s + r.totalCashOut, 0);
  return [
    String(games),
    TOTAL_PLAYER,
    money(buyIn),
    "",
    money(cashOut),
    "",
    money(cashOut - buyIn),
    "",
  ].join(",");
}

/**
 * Serialise back to the on-disk shape: header, player rows sorted by net
 * descending (stable, so equal-net rows keep their previous order), then the
 * TOTAL row, then a trailing newline.
 */
export function formatStandingsCsv(csv: StandingsCsv): string {
  const sorted = [...csv.rows].sort((a, b) => net(b) - net(a));
  const lines = [csv.header, ...sorted.map(formatRow), formatTotalRow(sorted)];
  return `${lines.join("\n")}\n`;
}
