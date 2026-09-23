"use client";

import { useId, useState } from "react";
import NumberInput from "../NumberInput";
import ModalShell, { ModalFooter, ModalHeader } from "../ModalShell";
import { fmtMoney } from "@/lib/money";

type Props = {
  title: string;
  subtitle?: string;
  /** Default buy-in amount, in DOLLARS. */
  defaultAmount: number;
  confirmLabel?: string;
  /** Called with the entered amount in DOLLARS. */
  onSubmit: (amount: number) => void;
  onClose: () => void;
};

const QUICK_AMOUNTS = [10, 20, 50, 100];

export default function BuyInDialog({
  title,
  subtitle,
  defaultAmount,
  confirmLabel = "Confirm",
  onSubmit,
  onClose,
}: Props) {
  const [amount, setAmount] = useState(defaultAmount || 0);
  const titleId = useId();
  const amountId = useId();

  const quickAmounts = Array.from(
    new Set([defaultAmount, ...QUICK_AMOUNTS]),
  )
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  return (
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="w-full sm:max-w-sm flex flex-col overflow-hidden"
    >
      <ModalHeader
        titleId={titleId}
        title={title}
        subtitle={subtitle}
        onClose={onClose}
      />

      <div className="p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={amountId} className="label">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted">
              $
            </span>
            <NumberInput
              id={amountId}
              className="input h-14 pl-9 text-2xl font-semibold tabular-nums"
              value={amount}
              onChange={setAmount}
              step={0.01}
              min={0}
              emptyValue={defaultAmount}
            />
          </div>
        </div>

        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(quickAmounts.length, 5)}, minmax(0, 1fr))` }}
        >
          {quickAmounts.map((n) => (
            <button
              key={n}
              type="button"
              className={`btn px-0 tabular-nums ${amount === n ? "btn-primary" : ""}`}
              onClick={() => setAmount(n)}
              aria-pressed={amount === n}
            >
              {fmtMoney(n).replace(/\.00$/, "")}
            </button>
          ))}
        </div>
      </div>

      <ModalFooter>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary flex-1 sm:flex-none"
          disabled={amount <= 0}
          onClick={() => onSubmit(amount)}
        >
          {confirmLabel}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}
