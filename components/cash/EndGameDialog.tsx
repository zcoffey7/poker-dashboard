"use client";

import { useMemo, useState } from "react";
import NumberInput from "../NumberInput";
import { useCash, totalBuyIns } from "@/lib/cashStore";
import { fmtMoney, fmtSigned } from "@/lib/money";

type Props = {
  onClose: () => void;
};

export default function EndGameDialog({ onClose }: Props) {
  const players = useCash((s) => s.players);
  const cashOutPlayer = useCash((s) => s.cashOutPlayer);
  const endGame = useCash((s) => s.endGame);

  const unsettled = useMemo(() => players.filter((p) => !p.cashOut), [players]);

  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(unsettled.map((p) => [p.id, 0])),
  );

  const totalIn = players.reduce((s, p) => s + totalBuyIns(p), 0);
  const alreadyOut = players
    .filter((p) => !!p.cashOut)
    .reduce((s, p) => s + (p.cashOut?.amount ?? 0), 0);
  const pendingOut = Object.values(amounts).reduce((s, v) => s + (v ?? 0), 0);
  const diff = totalIn - (alreadyOut + pendingOut);

  function submit() {
    unsettled.forEach((p) => {
      cashOutPlayer(p.id, amounts[p.id] ?? 0);
    });
    const ok = endGame();
    if (ok) onClose();
  }

  const canSubmit = unsettled.every((p) => (amounts[p.id] ?? 0) >= 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <div className="label">End Game</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              Enter each remaining player&apos;s final stack, then confirm.
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {unsettled.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)] italic">
              Everyone is already cashed out. Confirm to finalize the game.
            </div>
          ) : (
            unsettled.map((p) => {
              const inFor = totalBuyIns(p);
              const val = amounts[p.id] ?? 0;
              const net = val - inFor;
              const positive = net >= 0;
              return (
                <div
                  key={p.id}
                  className="card-2 p-3 rounded flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate flex-1">
                      {p.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      In for {fmtMoney(inFor)} ({p.buyIns.length}×)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm shrink-0">$</span>
                    <NumberInput
                      className="input flex-1 font-mono"
                      value={val}
                      onChange={(n) =>
                        setAmounts({ ...amounts, [p.id]: n })
                      }
                      step={0.01}
                      min={0}
                      placeholder="Final stack"
                    />
                    <span
                      className={`font-mono text-sm font-semibold min-w-[80px] text-right ${
                        positive
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {fmtSigned(net)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3 flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Summary label="Total in" value={fmtMoney(totalIn)} />
            <Summary
              label="Total out"
              value={fmtMoney(alreadyOut + pendingOut)}
            />
            <Summary
              label={diff === 0 ? "Balanced" : diff > 0 ? "Missing" : "Over"}
              value={fmtMoney(Math.abs(diff))}
              warn={diff !== 0}
            />
          </div>
          {diff !== 0 && (
            <div className="text-[11px] text-[var(--text-muted)] italic">
              Total chips in play should equal the sum of cash-outs. A mismatch
              usually means a buy-in or final stack is off.
            </div>
          )}
          <div className="flex justify-end gap-2 mt-1">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={!canSubmit}
            >
              End Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="card-2 p-2 rounded text-center">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={`font-mono font-semibold ${
          warn ? "text-[var(--amber)]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
