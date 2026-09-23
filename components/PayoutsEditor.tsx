"use client";

import { useMemo } from "react";
import { useTournamentStats } from "@/lib/useTournamentStats";
import { computeCashPayouts } from "@/lib/payouts";
import { confirmAction } from "@/lib/confirm";
import type { PayoutSpot } from "@/lib/types";
import NumberInput from "./NumberInput";
import { Affixed, Section } from "./Section";
import { IconPlus, IconTrash } from "./icons";

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
  // Preview against the draft prices, not the saved ones.
  const stats = useTournamentStats({ buyIn, rebuyCost, addOnCost });

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
  async function removeSpot(place: number) {
    const ok = await confirmAction({
      title: `Remove payout spot #${place}?`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    onChange(
      payouts
        .filter((p) => p.place !== place)
        .map((p, i) => ({ ...p, place: i + 1 })),
    );
  }

  return (
    <Section
      title="Payouts"
      description={
        <span className="inline-flex items-center gap-2 flex-wrap tabular-nums">
          <span>
            Pool{" "}
            <span className="text-gold font-medium">
              ${stats.prizePool.toLocaleString()}
            </span>{" "}
            · {total.toFixed(1)}% allocated
          </span>
          {totalOk ? (
            <span className="chip chip-primary">Adds up</span>
          ) : (
            <span className="chip chip-gold">
              {total > 100 ? "Over 100%" : "Under 100%"}
            </span>
          )}
        </span>
      }
      actions={
        <button className="btn btn-sm" onClick={addSpot}>
          <IconPlus />
          Place
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        {payouts.map((p) => (
          <div key={p.place} className="flex items-center gap-2.5">
            <span
              className={`chip min-w-[2.75rem] justify-center tabular-nums ${
                p.place === 1 ? "chip-gold" : ""
              }`}
            >
              #{p.place}
            </span>
            <div className="w-28">
              <Affixed suffix="%">
                <NumberInput
                  className="input input-sm pr-7 tabular-nums"
                  value={p.percent}
                  min={0}
                  max={100}
                  step={0.5}
                  aria-label={`Payout percent for place ${p.place}`}
                  onChange={(n) => updatePayout(p.place, n)}
                />
              </Affixed>
            </div>
            <span className="flex-1 text-right font-semibold tabular-nums">
              ${(cashAmounts[p.place] ?? 0).toLocaleString()}
            </span>
            <button
              className="btn btn-ghost btn-sm btn-icon hover:text-loss"
              onClick={() => removeSpot(p.place)}
              aria-label={`Remove payout spot ${p.place}`}
            >
              <IconTrash />
            </button>
          </div>
        ))}
        {payouts.length === 0 && (
          <div className="text-sm text-muted italic">No paid places yet.</div>
        )}
      </div>
    </Section>
  );
}
