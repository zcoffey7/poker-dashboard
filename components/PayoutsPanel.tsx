"use client";

import { useMemo } from "react";
import { useTournament } from "@/lib/store";
import { useTournamentStats } from "@/lib/useTournamentStats";
import { computeCashPayouts } from "@/lib/payouts";
import { IconTrophy } from "./icons";

export default function PayoutsPanel() {
  const payouts = useTournament((s) => s.payouts);
  const players = useTournament((s) => s.players);
  const stats = useTournamentStats();

  const pool = stats.prizePool;
  const { amounts: cashAmounts } = useMemo(
    () => computeCashPayouts(payouts, pool),
    [payouts, pool],
  );

  const paidSpots = payouts.length;
  const activeCount = stats.activeCount;

  // Anyone with a finish place fills their payout row — including players
  // who finished without being eliminated (auto-declared winners, chops).
  const winners = players
    .filter((p) => p.finishPlace && p.finishPlace <= paidSpots)
    .sort((a, b) => (a.finishPlace ?? 0) - (b.finishPlace ?? 0));

  return (
    <section
      aria-label="Payouts"
      className="card p-4 flex flex-col gap-3 md:h-full md:min-h-0"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconTrophy className="text-gold" />
          <span className="label">Payouts</span>
        </div>
        <div className="text-xs sm:text-sm text-muted tabular-nums">
          <span className="text-gold font-semibold">${pool.toLocaleString()}</span>{" "}
          pool · {paidSpots} place{paidSpots === 1 ? "" : "s"} paid
        </div>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto scrollbar-thin min-h-0 -mx-1.5 px-1.5">
        {payouts.map((p) => {
          const amt = cashAmounts[p.place] ?? 0;
          // A spot is still contested while at least `place` players remain
          // active: any of them could finish there. Decided spots without an
          // assigned finisher (deep finishes below the field size) show "—".
          const stillIn = activeCount >= p.place;
          const winner = winners.find((w) => w.finishPlace === p.place);
          const first = p.place === 1;
          return (
            <div
              key={p.place}
              className="flex items-center gap-3 rounded-[10px] px-2.5 py-2 bg-surface-2/60 border border-border/60"
            >
              <span
                className={`chip min-w-[2.75rem] justify-center tabular-nums ${
                  first ? "chip-gold" : ""
                }`}
              >
                #{p.place}
              </span>
              <span className="flex-1 truncate">
                {winner ? (
                  <span className="font-semibold">{winner.name}</span>
                ) : (
                  <span className="text-muted">{stillIn ? "TBD" : "—"}</span>
                )}
              </span>
              <span className="text-xs text-muted tabular-nums">{p.percent}%</span>
              <span
                className={`min-w-[5rem] text-right text-base font-semibold tabular-nums ${
                  first ? "text-gold" : ""
                }`}
              >
                ${amt.toLocaleString()}
              </span>
            </div>
          );
        })}
        {payouts.length === 0 && (
          <div className="text-sm text-muted italic">
            Configure payouts in settings.
          </div>
        )}
      </div>
    </section>
  );
}
