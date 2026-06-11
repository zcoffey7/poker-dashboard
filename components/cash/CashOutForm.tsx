"use client";

import { useState } from "react";
import NumberInput from "../NumberInput";
import { StatBox } from "../StatTiles";
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
  const amountCents = toCents(amount);
  const netCents = amountCents - totalInCents;
  const positive = netCents >= 0;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="label">Cashing out with</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg">$</span>
          <NumberInput
            className="input flex-1 font-mono text-lg"
            value={amount}
            onChange={setAmount}
            step={0.01}
            min={0}
            autoFocus={autoFocus}
            placeholder="Final stack"
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <StatBox label="Out for" value={fmtMoneyCents(amountCents)} />
        <StatBox
          label="Net"
          value={fmtSignedCents(netCents)}
          positive={positive}
          muted={!positive}
        />
      </div>

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={() => onSubmit(amount)}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
