"use client";

import { useMemo } from "react";
import { useTournament } from "@/lib/store";
import { computeStats } from "@/lib/selectors";
import { computeCashPayouts, CASH_INCREMENT } from "@/lib/payouts";
import { fmtDuration } from "@/lib/clock";
import type { Player } from "@/lib/types";

type Row = {
  id: string;
  name: string;
  place: number | null;
  isCoWinner: boolean;
  durationSec: number | null;
  entries: number;
  rebuys: number;
  addOns: number;
  moneyIn: number;
  payout: number;
  net: number;
};

function floorTo(n: number, step: number) {
  return Math.floor(n / step) * step;
}

function computeChopAmounts(
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

function placeLabel(place: number | null, isCoWinner: boolean): string {
  if (isCoWinner) return "CHOP";
  if (place == null) return "—";
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `${place}th`;
}

function placeMedal(place: number | null, isCoWinner: boolean): string {
  if (isCoWinner) return "🤝";
  if (place === 1) return "🏆";
  if (place === 2) return "🥈";
  if (place === 3) return "🥉";
  return "";
}

export default function GameRecap() {
  const state = useTournament();
  const {
    name,
    players,
    buyIn,
    addOnCost,
    payouts,
    blindStructure,
    startedAt,
    finishedAt,
    finishType,
    chopShares,
    clock,
  } = state;
  const unfinishTournament = useTournament((s) => s.unfinishTournament);
  const resetTournament = useTournament((s) => s.resetTournament);

  const stats = useMemo(
    () =>
      computeStats(
        players,
        blindStructure,
        clock.currentLevel,
        buyIn,
        addOnCost,
      ),
    [players, blindStructure, clock.currentLevel, buyIn, addOnCost],
  );
  const pool = stats.prizePool;

  const { amounts: cashAmounts } = useMemo(
    () => computeCashPayouts(payouts, pool),
    [payouts, pool],
  );
  const chopAmounts = useMemo(
    () => (chopShares ? computeChopAmounts(chopShares, pool) : {}),
    [chopShares, pool],
  );

  const rows: Row[] = useMemo(() => {
    const isChop = finishType === "chop" && !!chopShares;
    const chopSet =
      isChop && chopShares
        ? new Set(Object.keys(chopShares))
        : new Set<string>();

    return players
      .map((p: Player) => {
        const entries = 1 + (p.rebuys ?? 0);
        const addOns = p.addOns ?? 0;
        const moneyIn = entries * buyIn + addOns * addOnCost;
        const isCoWinner = isChop && chopSet.has(p.id);
        // payout
        let payout = 0;
        if (isCoWinner) {
          payout = chopAmounts[p.id] ?? 0;
        } else if (p.finishPlace != null) {
          payout = cashAmounts[p.finishPlace] ?? 0;
        }
        // duration: startedAt -> eliminatedAt or finishedAt
        let durationSec: number | null = null;
        if (startedAt) {
          const end = p.eliminatedAt ?? finishedAt ?? Date.now();
          durationSec = Math.max(0, Math.round((end - startedAt) / 1000));
        }
        return {
          id: p.id,
          name: p.name,
          place: p.finishPlace ?? null,
          isCoWinner,
          durationSec,
          entries,
          rebuys: p.rebuys ?? 0,
          addOns,
          moneyIn,
          payout,
          net: payout - moneyIn,
        };
      })
      .sort((a, b) => {
        // Co-winners first, then by place ascending, then unset last.
        if (a.isCoWinner !== b.isCoWinner) return a.isCoWinner ? -1 : 1;
        const ap = a.place ?? Number.POSITIVE_INFINITY;
        const bp = b.place ?? Number.POSITIVE_INFINITY;
        return ap - bp;
      });
  }, [
    players,
    buyIn,
    addOnCost,
    cashAmounts,
    chopAmounts,
    chopShares,
    finishType,
    startedAt,
    finishedAt,
  ]);

  const winners = rows.filter((r) =>
    finishType === "chop" ? r.isCoWinner : r.place === 1,
  );
  const others = rows.filter((r) =>
    finishType === "chop" ? !r.isCoWinner : r.place !== 1,
  );

  const totalDurationSec =
    startedAt && finishedAt
      ? Math.max(0, Math.round((finishedAt - startedAt) / 1000))
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col overflow-hidden">
      <div className="flex-none px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3 border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {finishType === "chop" ? "Chopped" : "Tournament Complete"}
            </div>
            <div className="text-xl sm:text-2xl font-semibold truncate">
              {name}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              ${pool.toLocaleString()} prize pool
              {totalDurationSec != null && (
                <> · Ran for {fmtDuration(totalDurationSec)}</>
              )}
              {" · "}
              {stats.totalPlayers} player
              {stats.totalPlayers === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (
                  confirm(
                    "Reopen the tournament? You can keep playing; the recap will still be available once it ends again.",
                  )
                ) {
                  unfinishTournament();
                }
              }}
            >
              Reopen
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (
                  confirm(
                    "Start a brand-new tournament? This will clear all players, chips, and settings.",
                  )
                ) {
                  resetTournament();
                }
              }}
            >
              New Tournament
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6 flex flex-col gap-5">
          {winners.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="label">
                {finishType === "chop" ? "Co-Winners" : "Champion"}
              </div>
              <div
                className={`grid gap-3 ${
                  winners.length > 1
                    ? "sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {winners.map((w) => (
                  <WinnerCard key={w.id} row={w} />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="label">Participants</div>
              <div className="flex flex-col gap-2">
                {others.map((r) => (
                  <ParticipantRow key={r.id} row={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function WinnerCard({ row }: { row: Row }) {
  return (
    <div className="card p-4 flex flex-col gap-3 border-[var(--accent)]/40 bg-gradient-to-br from-[var(--accent)]/10 to-transparent">
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">
          {placeMedal(row.place, row.isCoWinner)}
        </span>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {placeLabel(row.place, row.isCoWinner)}
          </div>
          <div className="text-lg font-semibold truncate">{row.name}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Won" value={`$${row.payout.toLocaleString()}`} emphasize />
        <Stat
          label="Net"
          value={`${row.net >= 0 ? "+" : "−"}$${Math.abs(row.net).toLocaleString()}`}
          emphasize
          positive={row.net >= 0}
        />
        <Stat label="Buy-in" value={`${row.entries}×`} />
        <Stat label="Add-ons" value={`${row.addOns}×`} />
        <Stat
          label="Money in"
          value={`$${row.moneyIn.toLocaleString()}`}
        />
        <Stat
          label="Played"
          value={row.durationSec != null ? fmtDuration(row.durationSec) : "—"}
        />
      </div>
    </div>
  );
}

function ParticipantRow({ row }: { row: Row }) {
  const positive = row.net >= 0;
  return (
    <div className="card p-3 grid grid-cols-12 items-center gap-2 text-sm">
      <div className="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0">
        <span className="chip min-w-[46px] justify-center font-semibold shrink-0">
          {placeLabel(row.place, row.isCoWinner)}
        </span>
        <span className="truncate font-medium">{row.name}</span>
      </div>
      <div className="col-span-4 sm:col-span-3 text-[var(--text-muted)] font-mono text-xs sm:text-sm">
        {row.durationSec != null ? fmtDuration(row.durationSec) : "—"}
      </div>
      <div className="col-span-3 sm:col-span-2 text-[var(--text-muted)] text-xs sm:text-sm">
        {row.entries}×
        {row.addOns > 0 ? ` · ${row.addOns}A` : ""}
      </div>
      <div className="col-span-6 sm:col-span-1 text-[var(--text-muted)] font-mono text-xs sm:text-sm sm:text-right">
        ${row.moneyIn.toLocaleString()}
      </div>
      <div className="col-span-3 sm:col-span-1 font-mono font-semibold text-right">
        ${row.payout.toLocaleString()}
      </div>
      <div
        className={`col-span-3 sm:col-span-1 font-mono text-right ${
          positive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
        }`}
      >
        {positive ? "+" : "−"}${Math.abs(row.net).toLocaleString()}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
  positive,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={`font-mono ${emphasize ? "text-base font-semibold" : "text-sm"} ${
          positive === true
            ? "text-[var(--accent)]"
            : positive === false
              ? "text-[var(--text-muted)]"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
