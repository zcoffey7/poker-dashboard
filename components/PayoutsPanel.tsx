"use client";

import { useMemo } from "react";
import { useTournament } from "@/lib/store";
import { computeStats } from "@/lib/selectors";
import { computeCashPayouts } from "@/lib/payouts";

export default function PayoutsPanel() {
  const payouts = useTournament((s) => s.payouts);
  const players = useTournament((s) => s.players);
  const blindStructure = useTournament((s) => s.blindStructure);
  const currentLevel = useTournament((s) => s.clock.currentLevel);
  const buyIn = useTournament((s) => s.buyIn);
  const addOnCost = useTournament((s) => s.addOnCost);
  const stats = useMemo(
    () =>
      computeStats(players, blindStructure, currentLevel, buyIn, addOnCost),
    [players, blindStructure, currentLevel, buyIn, addOnCost],
  );

  const pool = stats.prizePool;
  const { amounts: cashAmounts } = useMemo(
    () => computeCashPayouts(payouts, pool),
    [payouts, pool],
  );

  const inTheMoney = payouts.length;
  const activeCount = stats.activeCount;

  const winners = players
    .filter((p) => p.eliminated && p.finishPlace && p.finishPlace <= inTheMoney)
    .sort((a, b) => (a.finishPlace ?? 0) - (b.finishPlace ?? 0));

  return (
    <div className="card p-3 flex flex-col gap-2 sm:h-full sm:min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Payouts</div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            ${pool.toLocaleString()} pool •{" "}
            {inTheMoney} place{inTheMoney === 1 ? "" : "s"} paid
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 overflow-y-auto scrollbar-thin min-h-0 -mr-2 pr-2">
        {payouts.map((p) => {
          const amt = cashAmounts[p.place] ?? 0;
          const stillIn =
            activeCount > 0 &&
            p.place > Math.max(0, activeCount - inTheMoney);
          const winner = winners.find((w) => w.finishPlace === p.place);
          return (
            <div
              key={p.place}
              className="flex items-center gap-3 text-sm px-2 py-1.5 rounded hover:bg-black/20"
            >
              <span className="chip min-w-[40px] justify-center font-semibold">
                #{p.place}
              </span>
              <span className="flex-1 truncate">
                {winner ? (
                  <span className="font-medium">{winner.name}</span>
                ) : (
                  <span className="text-[var(--text-muted)]">
                    {stillIn ? "TBD" : "—"}
                  </span>
                )}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {p.percent}%
              </span>
              <span className="font-mono font-semibold min-w-[80px] text-right">
                ${amt.toLocaleString()}
              </span>
            </div>
          );
        })}
        {payouts.length === 0 && (
          <div className="text-sm text-[var(--text-muted)] italic">
            Configure payouts in settings.
          </div>
        )}
      </div>
    </div>
  );
}
