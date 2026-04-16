"use client";

import { useEffect, useId, useMemo, useState } from "react";
import NumberInput from "../NumberInput";
import { useCash, totalBuyIns } from "@/lib/cashStore";
import { fmtMoneyCents, fmtSignedCents, toCents } from "@/lib/money";

type Props = {
  playerId: string;
  onClose: () => void;
};

export default function CashOutDialog({ playerId, onClose }: Props) {
  const player = useCash((s) => s.players.find((p) => p.id === playerId));
  const cashOutPlayer = useCash((s) => s.cashOutPlayer);

  const [amount, setAmount] = useState(0);
  const titleId = useId();

  const totalInCents = useMemo(
    () => (player ? totalBuyIns(player) : 0),
    [player],
  );
  const amountCents = toCents(amount);
  const netCents = amountCents - totalInCents;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!player) return null;

  const positive = netCents >= 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="min-w-0">
            <div className="label" id={titleId}>
              Cash Out
            </div>
            <div className="text-sm font-semibold mt-0.5 truncate">
              {player.name}
            </div>
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
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat
              label="Buy-ins"
              value={`${player.buyIns.length}×`}
            />
            <Stat label="In for" value={fmtMoneyCents(totalInCents)} />
          </div>

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
                autoFocus
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label="Out for" value={fmtMoneyCents(amountCents)} />
            <Stat
              label="Net"
              value={fmtSignedCents(netCents)}
              positive={positive}
              muted={!positive}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              cashOutPlayer(playerId, amount);
              onClose();
            }}
          >
            Confirm Cash Out
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
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
    <div className="card-2 p-2 rounded">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={`font-mono text-sm font-semibold ${
          positive
            ? "text-[var(--accent)]"
            : muted
              ? "text-[var(--text-muted)]"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
