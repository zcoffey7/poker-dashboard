"use client";

import { useMemo } from "react";
import { useCash, totalBuyIns } from "@/lib/cashStore";
import { fmtMoneyCents, fmtSignedCents } from "@/lib/money";
import { fmtDuration } from "@/lib/clock";

type Row = {
  id: string;
  name: string;
  buyInCount: number;
  moneyIn: number;
  payout: number;
  net: number;
  durationSec: number | null;
};

export default function CashRecap() {
  const name = useCash((s) => s.name);
  const players = useCash((s) => s.players);
  const startedAt = useCash((s) => s.startedAt);
  const endedAt = useCash((s) => s.endedAt);
  const reopenGame = useCash((s) => s.reopenGame);
  const resetGame = useCash((s) => s.resetGame);

  const rows: Row[] = useMemo(() => {
    return players
      .map((p) => {
        const moneyIn = totalBuyIns(p);
        const payout = p.cashOut?.amount ?? 0;
        const net = payout - moneyIn;
        let durationSec: number | null = null;
        const firstBuyIn = p.buyIns[0]?.at;
        const end = p.cashOut?.at ?? endedAt;
        if (firstBuyIn && end) {
          durationSec = Math.max(0, Math.round((end - firstBuyIn) / 1000));
        }
        return {
          id: p.id,
          name: p.name,
          buyInCount: p.buyIns.length,
          moneyIn,
          payout,
          net,
          durationSec,
        };
      })
      .sort((a, b) => {
        if (b.net !== a.net) return b.net - a.net;
        const byName = a.name.localeCompare(b.name);
        if (byName !== 0) return byName;
        return a.id.localeCompare(b.id);
      });
  }, [players, endedAt]);

  const totals = useMemo(() => {
    const totalIn = rows.reduce((s, r) => s + r.moneyIn, 0);
    const totalOut = rows.reduce((s, r) => s + r.payout, 0);
    const biggestWin = rows.length > 0 ? rows[0] : null;
    const winners = rows.filter((r) => r.net > 0).length;
    const losers = rows.filter((r) => r.net < 0).length;
    return { totalIn, totalOut, biggestWin, winners, losers };
  }, [rows]);

  const totalDurationSec =
    startedAt && endedAt
      ? Math.max(0, Math.round((endedAt - startedAt) / 1000))
      : null;

  const positiveNet = (n: number) => (n === 0 ? null : n > 0);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col overflow-hidden">
      <div className="flex-none px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3 border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Game Complete
            </div>
            <div className="text-xl sm:text-2xl font-semibold truncate">
              {name}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {fmtMoneyCents(totals.totalIn)} in play
              {totalDurationSec != null && (
                <> · Ran for {fmtDuration(totalDurationSec)}</>
              )}
              {" · "}
              {rows.length} player{rows.length === 1 ? "" : "s"}
              {" · "}
              {totals.winners} up, {totals.losers} down
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (confirm("Reopen the game? You can keep playing.")) {
                  reopenGame();
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
                    "Start a brand-new cash game? This clears all players and transactions.",
                  )
                ) {
                  resetGame();
                }
              }}
            >
              New Game
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6 flex flex-col gap-5">
          {totals.biggestWin && totals.biggestWin.net > 0 && (
            <section className="flex flex-col gap-3">
              <div className="label">Biggest Winner</div>
              <div className="card p-4 flex flex-col gap-3 border-[var(--accent)]/40 bg-gradient-to-br from-[var(--accent)]/10 to-transparent">
                <div className="flex items-center gap-2">
                  <span className="text-2xl leading-none">🏆</span>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      1st (by net)
                    </div>
                    <div className="text-lg font-semibold truncate">
                      {totals.biggestWin.name}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat
                    label="In for"
                    value={fmtMoneyCents(totals.biggestWin.moneyIn)}
                    emphasize
                  />
                  <Stat
                    label="Out for"
                    value={fmtMoneyCents(totals.biggestWin.payout)}
                    emphasize
                  />
                  <Stat
                    label="Buy-ins"
                    value={`${totals.biggestWin.buyInCount}×`}
                  />
                  {totals.biggestWin.durationSec != null && (
                    <Stat
                      label="Played"
                      value={fmtDuration(totals.biggestWin.durationSec)}
                    />
                  )}
                  <Stat
                    label="Net"
                    value={fmtSignedCents(totals.biggestWin.net)}
                    emphasize
                    positive={positiveNet(totals.biggestWin.net)}
                  />
                </div>
              </div>
            </section>
          )}

          {rows.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="label">All Players</div>
              <div className="flex flex-col gap-2">
                {rows.map((r, idx) => (
                  <ParticipantRow key={r.id} row={r} place={idx + 1} />
                ))}
              </div>
            </section>
          )}

          <section className="card p-3 grid grid-cols-3 gap-2 text-sm">
            <Stat label="Total in" value={fmtMoneyCents(totals.totalIn)} />
            <Stat label="Total out" value={fmtMoneyCents(totals.totalOut)} />
            <Stat
              label={totals.totalIn === totals.totalOut ? "Balanced" : "Diff"}
              value={fmtMoneyCents(Math.abs(totals.totalIn - totals.totalOut))}
              muted={totals.totalIn !== totals.totalOut}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function ParticipantRow({ row, place }: { row: Row; place: number }) {
  const positive = row.net >= 0;
  return (
    <div className="card p-3 flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="chip min-w-[46px] justify-center font-semibold shrink-0">
          #{place}
        </span>
        <span className="truncate font-medium flex-1">{row.name}</span>
        <span className="text-xs text-[var(--text-muted)] shrink-0">
          {row.buyInCount}×
        </span>
        {row.durationSec != null && (
          <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">
            {fmtDuration(row.durationSec)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm border-t border-[var(--border)] pt-2">
        <MiniStat label="In for" value={fmtMoneyCents(row.moneyIn)} />
        <MiniStat label="Out for" value={fmtMoneyCents(row.payout)} />
        <MiniStat
          label="Net"
          value={fmtSignedCents(row.net)}
          positive={positive}
          muted={!positive}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
  positive,
  muted,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  positive?: boolean | null;
  muted?: boolean;
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
            : muted || positive === false
              ? "text-[var(--text-muted)]"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  positive,
  muted,
}: {
  label: string;
  value: string;
  positive?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className={`font-mono font-semibold truncate ${
          positive
            ? "text-[var(--accent)]"
            : muted
              ? "text-[var(--text-muted)]"
              : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
