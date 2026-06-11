"use client";

import { useId, useState } from "react";
import NumberInput from "../NumberInput";
import ModalShell from "../ModalShell";
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

  const quickAmounts = Array.from(
    new Set([defaultAmount, ...QUICK_AMOUNTS]),
  ).filter((n) => n > 0);

  return (
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="w-full max-w-sm flex flex-col overflow-hidden"
    >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="min-w-0">
            <div className="label" id={titleId}>
              {title}
            </div>
            {subtitle && (
              <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                {subtitle}
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Amount</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg">$</span>
              <NumberInput
                className="input flex-1 font-mono text-lg"
                value={amount}
                onChange={setAmount}
                step={0.01}
                min={0}
                autoFocus
                emptyValue={defaultAmount}
              />
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((n) => (
              <button
                key={n}
                type="button"
                className={`btn btn-sm ${amount === n ? "btn-primary" : ""}`}
                onClick={() => setAmount(n)}
              >
                {fmtMoney(n)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={amount <= 0}
            onClick={() => onSubmit(amount)}
          >
            {confirmLabel}
          </button>
        </div>
    </ModalShell>
  );
}
