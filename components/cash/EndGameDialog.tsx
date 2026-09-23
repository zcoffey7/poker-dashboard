"use client";

import { useId, useMemo, useState } from "react";
import NumberInput from "../NumberInput";
import ModalShell, { ModalFooter, ModalHeader } from "../ModalShell";
import { useCash, totalBuyIns } from "@/lib/cashStore";
import { confirmAction } from "@/lib/confirm";
import { fmtMoneyCents, fmtSignedCents, toCents } from "@/lib/money";

type Props = {
  onClose: () => void;
};

export default function EndGameDialog({ onClose }: Props) {
  const players = useCash((s) => s.players);
  const cashOutPlayer = useCash((s) => s.cashOutPlayer);
  const endGame = useCash((s) => s.endGame);

  const unsettled = useMemo(() => players.filter((p) => !p.cashOut), [players]);
  const signature = unsettled.map((p) => p.id).join("|");

  // Dollar-valued draft amounts, keyed by player id. Whenever the unsettled
  // set changes we merge by id (preserve existing, default new to 0, drop
  // removed). We do this in render rather than an effect to avoid cascading
  // renders — see https://react.dev/learn/you-might-not-need-an-effect .
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(unsettled.map((p) => [p.id, 0])),
  );
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setAmounts((prev) => {
      const next: Record<string, number> = {};
      for (const p of unsettled) {
        next[p.id] = prev[p.id] ?? 0;
      }
      return next;
    });
  }

  const [acknowledged, setAcknowledged] = useState(false);

  const titleId = useId();
  const ackId = useId();

  // All math in integer cents so the balance check is exact.
  const totalInCents = players.reduce((s, p) => s + totalBuyIns(p), 0);
  const alreadyOutCents = players
    .filter((p) => !!p.cashOut)
    .reduce((s, p) => s + (p.cashOut?.amount ?? 0), 0);
  const pendingOutCents = Object.values(amounts).reduce(
    (s, v) => s + toCents(v ?? 0),
    0,
  );
  const diffCents = totalInCents - (alreadyOutCents + pendingOutCents);
  const balanced = diffCents === 0;

  // The imbalance acknowledgment is tied to the exact discrepancy it was
  // given for. If amounts change (different diff, or back to balanced and
  // out again), the user must re-acknowledge. Render-time adjust, same
  // pattern as the signature merge above.
  const ackKey = `${signature}|${diffCents}`;
  const [lastAckKey, setLastAckKey] = useState(ackKey);
  if (ackKey !== lastAckKey) {
    setLastAckKey(ackKey);
    if (acknowledged) setAcknowledged(false);
  }

  // Backdrop / Escape / Cancel all funnel through here (via ModalShell):
  // entered final stacks are real work, don't discard them on a stray tap.
  const hasEnteredAmounts = unsettled.some((p) => (amounts[p.id] ?? 0) > 0);
  async function requestClose() {
    if (hasEnteredAmounts) {
      const ok = await confirmAction({
        title: "Discard the final stacks you've entered?",
        confirmLabel: "Discard",
        tone: "danger",
      });
      if (!ok) return;
    }
    onClose();
  }

  function submit() {
    unsettled.forEach((p) => {
      cashOutPlayer(p.id, amounts[p.id] ?? 0, { viaEndGame: true });
    });
    const ok = endGame();
    if (ok) onClose();
  }

  const validAmounts = unsettled.every((p) => (amounts[p.id] ?? 0) >= 0);
  const canSubmitBalanced = validAmounts && balanced;
  const canSubmitOverride = validAmounts && !balanced && acknowledged;

  return (
    <ModalShell
      onClose={requestClose}
      labelledBy={titleId}
      cardClassName="w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
    >
      <ModalHeader
        titleId={titleId}
        title="End Game"
        subtitle="Enter each remaining player's final stack, then confirm."
        onClose={requestClose}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-2">
        {unsettled.length === 0 ? (
          <div className="text-sm text-muted text-center py-4">
            Everyone is already cashed out. Confirm to finalize the game.
          </div>
        ) : (
          unsettled.map((p) => {
            const inForCents = totalBuyIns(p);
            const val = amounts[p.id] ?? 0;
            const netCents = toCents(val) - inForCents;
            return (
              <div key={p.id} className="card-2 p-3 flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold truncate flex-1">{p.name}</span>
                  <span className="text-xs text-muted tabular-nums shrink-0">
                    In for {fmtMoneyCents(inForCents)} · {p.buyIns.length}×
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-medium">
                      $
                    </span>
                    <NumberInput
                      className="input pl-8 font-semibold tabular-nums"
                      value={val}
                      onChange={(n) => setAmounts({ ...amounts, [p.id]: n })}
                      step={0.01}
                      min={0}
                      placeholder="Final stack"
                      aria-label={`Final stack for ${p.name}`}
                    />
                  </div>
                  <span
                    className={`min-w-[5.5rem] text-right font-semibold tabular-nums ${
                      netCents > 0 ? "text-gain" : netCents < 0 ? "text-loss" : "text-muted"
                    }`}
                  >
                    {fmtSignedCents(netCents)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border px-4 sm:px-5 pt-3 flex flex-col gap-2.5 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <Summary label="Total in" value={fmtMoneyCents(totalInCents)} />
          <Summary
            label="Total out"
            value={fmtMoneyCents(alreadyOutCents + pendingOutCents)}
          />
          <Summary
            label={balanced ? "Balanced" : diffCents > 0 ? "Missing" : "Over"}
            value={fmtMoneyCents(Math.abs(diffCents))}
            tone={balanced ? "ok" : "warn"}
          />
        </div>
        {!balanced && (
          <>
            <p className="text-xs text-muted">
              Chips in play should equal the total cashed out. A mismatch
              usually means a buy-in or final stack is off.
            </p>
            <label
              className="flex items-center gap-2.5 text-sm text-warn cursor-pointer"
              htmlFor={ackId}
            >
              <input
                id={ackId}
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>I understand the books are not balanced.</span>
            </label>
          </>
        )}
      </div>

      <ModalFooter className="border-t-0 bg-transparent">
        <button className="btn btn-ghost" onClick={requestClose}>
          Cancel
        </button>
        {balanced ? (
          <button
            className="btn btn-primary flex-1 sm:flex-none"
            onClick={submit}
            disabled={!canSubmitBalanced}
          >
            End Game
          </button>
        ) : (
          <button
            className="btn btn-danger flex-1 sm:flex-none"
            onClick={submit}
            disabled={!canSubmitOverride}
            title="End the game even though totals don't balance. You'll have to reconcile manually."
          >
            End anyway
          </button>
        )}
      </ModalFooter>
    </ModalShell>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div
      className={`card-2 px-2 py-2 text-center ${
        tone === "warn" ? "border-warn/40" : tone === "ok" ? "border-primary/40" : ""
      }`}
    >
      <div className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      <div
        className={`font-semibold tabular-nums ${
          tone === "warn" ? "text-warn" : tone === "ok" ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
