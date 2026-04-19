"use client";

import { useMemo } from "react";
import { useTournament } from "@/lib/store";
import { computeStats } from "@/lib/selectors";
import { computeCashPayouts } from "@/lib/payouts";
import type { PayoutSpot } from "@/lib/types";
import NumberInput from "./NumberInput";

type Props = {
  payouts: PayoutSpot[];
  buyIn: number;
  rebuyCost: number;
  addOnCost: number;
  onChange: (payouts: PayoutSpot[]) => void;
};

export default function PayoutsEditor({
  payouts,
  buyIn,
  rebuyCost,
  addOnCost,
  onChange,
}: Props) {
  const players = useTournament((s) => s.players);
  const blindStructure = useTournament((s) => s.blindStructure);
  const currentLevel = useTournament((s) => s.clock.currentLevel);
  const stats = useMemo(
    () =>
      computeStats(
        players,
        blindStructure,
        currentLevel,
        buyIn,
        addOnCost,
        {},
        rebuyCost,
      ),
    [players, blindStructure, currentLevel, buyIn, addOnCost, rebuyCost],
  );

  const total = payouts.reduce((s, p) => s + p.percent, 0);
  const totalOk = Math.abs(total - 100) < 0.01;

  const { amounts: cashAmounts } = useMemo(
    () => computeCashPayouts(payouts, stats.prizePool),
    [payouts, stats.prizePool],
  );

  function updatePayout(place: number, percent: number) {
    onChange(payouts.map((p) => (p.place === place ? { ...p, percent } : p)));
  }
  function addSpot() {
    onChange([...payouts, { place: payouts.length + 1, percent: 0 }]);
  }
  function removeSpot(place: number) {
    onChange(
      payouts
        .filter((p) => p.place !== place)
        .map((p, i) => ({ ...p, place: i + 1 })),
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Payouts</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            Pool ${stats.prizePool.toLocaleString()} • Total {total.toFixed(1)}%{" "}
            {totalOk ? (
              <span className="chip chip-green">OK</span>
            ) : (
              <span className="chip chip-amber">
                {total > 100 ? "Over 100%" : "Under 100%"}
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-sm btn-primary" onClick={addSpot}>
          + Place
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {payouts.map((p) => (
          <div key={p.place} className="flex items-center gap-2">
            <span className="chip min-w-[40px] justify-center">
              #{p.place}
            </span>
            <NumberInput
              className="input !py-1 !text-sm w-[100px]"
              value={p.percent}
              min={0}
              max={100}
              step={0.5}
              onChange={(n) => updatePayout(p.place, n)}
            />
            <span className="text-xs text-[var(--text-muted)]">%</span>
            <span className="flex-1 text-right font-mono text-sm">
              ${(cashAmounts[p.place] ?? 0).toLocaleString()}
            </span>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => removeSpot(p.place)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
