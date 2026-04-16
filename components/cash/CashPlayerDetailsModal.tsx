"use client";

import { useMemo, useState } from "react";
import NumberInput from "../NumberInput";
import { useCash, totalBuyIns, playerNet } from "@/lib/cashStore";
import { fmtMoney, fmtSigned } from "@/lib/money";

type Props = {
  playerId: string;
  onClose: () => void;
};

function fmtShortTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CashPlayerDetailsModal({ playerId, onClose }: Props) {
  const player = useCash((s) => s.players.find((p) => p.id === playerId));
  const renamePlayer = useCash((s) => s.renamePlayer);
  const rebuy = useCash((s) => s.rebuy);
  const editBuyIn = useCash((s) => s.editBuyIn);
  const removeBuyIn = useCash((s) => s.removeBuyIn);
  const reopenPlayer = useCash((s) => s.reopenPlayer);
  const cashOutPlayer = useCash((s) => s.cashOutPlayer);
  const defaultBuyIn = useCash((s) => s.defaultBuyIn);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(player?.name ?? "");

  const totalIn = useMemo(
    () => (player ? totalBuyIns(player) : 0),
    [player],
  );
  const net = player ? playerNet(player) : null;

  if (!player) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] gap-2">
          <div className="min-w-0 flex-1">
            <div className="label">Player</div>
            {editingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  renamePlayer(playerId, nameDraft);
                  setEditingName(false);
                }}
                className="flex gap-2 mt-1"
              >
                <input
                  className="input flex-1"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" type="submit">
                  Save
                </button>
              </form>
            ) : (
              <button
                className="text-lg font-semibold truncate mt-0.5 hover:underline underline-offset-2 block text-left w-full"
                onClick={() => {
                  setNameDraft(player.name);
                  setEditingName(true);
                }}
              >
                {player.name}
              </button>
            )}
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {player.cashOut ? "Cashed out" : "Active"}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Buy-ins" value={`${player.buyIns.length}×`} />
            <Stat label="In for" value={fmtMoney(totalIn)} />
            <Stat
              label={player.cashOut ? "Net" : "Out for"}
              value={
                player.cashOut
                  ? fmtSigned(net ?? 0)
                  : "—"
              }
              positive={player.cashOut ? (net ?? 0) >= 0 : undefined}
              muted={player.cashOut ? (net ?? 0) < 0 : undefined}
            />
          </div>

          {player.cashOut && (
            <div className="card-2 p-3 rounded flex items-center justify-between text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Cash out
                </div>
                <div className="font-mono font-semibold">
                  {fmtMoney(player.cashOut.amount)}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  at {fmtShortTime(player.cashOut.at)}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => reopenPlayer(playerId)}
              >
                Undo
              </button>
            </div>
          )}

          <div>
            <div className="label mb-2">Buy-ins</div>
            <div className="flex flex-col gap-1">
              {player.buyIns.length === 0 && (
                <div className="text-sm text-[var(--text-muted)] italic">
                  No buy-ins recorded.
                </div>
              )}
              {player.buyIns.map((b, idx) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-black/20"
                >
                  <span className="chip text-[10px] min-w-[32px] justify-center">
                    #{idx + 1}
                  </span>
                  <span className="font-mono shrink-0">$</span>
                  <NumberInput
                    className="input flex-1 font-mono text-sm"
                    value={b.amount}
                    onChange={(n) => editBuyIn(playerId, b.id, n)}
                    step={0.01}
                    min={0}
                  />
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                    {fmtShortTime(b.at)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm !px-2 !py-0.5"
                    onClick={() => {
                      if (confirm("Remove this buy-in entry?"))
                        removeBuyIn(playerId, b.id);
                    }}
                    title="Remove buy-in"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {!player.cashOut && (
              <button
                className="btn btn-sm mt-2"
                onClick={() => rebuy(playerId, defaultBuyIn)}
              >
                + Add default {fmtMoney(defaultBuyIn)} buy-in
              </button>
            )}
          </div>

          {!player.cashOut && (
            <QuickCashOut
              onSubmit={(amount) => {
                cashOutPlayer(playerId, amount);
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function QuickCashOut({ onSubmit }: { onSubmit: (amount: number) => void }) {
  const [amount, setAmount] = useState(0);
  return (
    <div className="border-t border-[var(--border)] pt-3">
      <div className="label mb-2">Cash Out</div>
      <div className="flex items-center gap-2">
        <span className="font-mono">$</span>
        <NumberInput
          className="input flex-1 font-mono"
          value={amount}
          onChange={setAmount}
          step={0.01}
          min={0}
          placeholder="Final stack"
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onSubmit(amount)}
        >
          Confirm
        </button>
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
