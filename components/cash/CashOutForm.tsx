"use client";

import { useId, useState } from "react";
import NumberInput from "../NumberInput";
import { StatBox, netTone } from "../StatTiles";
import { confirmAction } from "@/lib/confirm";
import { fmtMoneyCents, fmtSignedCents, toCents } from "@/lib/money";

type Props = {
  /** The player's total buy-ins in integer cents, for the net preview. */
  totalInCents: number;
  /** Called with the entered final stack in DOLLARS. */
  onSubmit: (amount: number) => void;
  confirmLabel?: string;
  autoFocus?: boolean;
};

/**
 * The single cash-out entry path: amount input, live out-for/net preview,
 * and confirm. Used by both CashOutDialog (roster) and
 * CashPlayerDetailsModal so the two flows can't drift.
 */
export default function CashOutForm({
  totalInCents,
  onSubmit,
  confirmLabel = "Confirm Cash Out",
  autoFocus,
}: Props) {
  const [amount, setAmount] = useState(0);
  const [dirty, setDirty] = useState(false);
  const amountId = useId();
  const amountCents = toCents(amount);
  const netCents = amountCents - totalInCents;

  async function handleSubmit() {
    if (!dirty) return;
    if (amount <= 0) {
      const ok = await confirmAction({
        title: "Cash out for $0.00?",
        message: "Use this when the player busted with nothing left.",
        confirmLabel: "Cash out $0",
      });
      if (!ok) return;
    }
    onSubmit(amount);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={amountId} className="label">
          Cashing out with
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted">
            $
          </span>
          <NumberInput
            id={amountId}
            className="input h-14 pl-9 text-2xl font-semibold tabular-nums"
            value={amount}
            onChange={(n) => {
              setDirty(true);
              setAmount(n);
            }}
            step={0.01}
            min={0}
            data-autofocus={autoFocus || undefined}
            placeholder="Final stack"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Out for" value={fmtMoneyCents(amountCents)} />
        <StatBox
          label="Net"
          value={fmtSignedCents(netCents)}
          tone={dirty ? netTone(netCents) : undefined}
        />
      </div>

      <button
        className="btn btn-primary btn-lg w-full mt-1"
        onClick={handleSubmit}
        disabled={!dirty}
        title={!dirty ? "Enter a final stack amount first" : undefined}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
