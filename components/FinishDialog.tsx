"use client";

import { useMemo, useState } from "react";
import { useTournament } from "@/lib/store";
import { computeStats } from "@/lib/selectors";
import { CASH_INCREMENT } from "@/lib/payouts";

type Props = {
  onClose: () => void;
};

function floorTo(n: number, step: number) {
  return Math.floor(n / step) * step;
}

export default function FinishDialog({ onClose }: Props) {
  const players = useTournament((s) => s.players);
  const buyIn = useTournament((s) => s.buyIn);
  const addOnCost = useTournament((s) => s.addOnCost);
  const rebuyCost = useTournament((s) => s.rebuyCost);
  const blindStructure = useTournament((s) => s.blindStructure);
  const currentLevel = useTournament((s) => s.clock.currentLevel);
  const finishTournament = useTournament((s) => s.finishTournament);
  const removedEntries = useTournament((s) => s.removedEntries);

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
        removedEntries,
      ),
    [
      players,
      blindStructure,
      currentLevel,
      buyIn,
      addOnCost,
      rebuyCost,
      removedEntries,
    ],
  );
  const pool = stats.prizePool;

  const active = useMemo(
    () => players.filter((p) => !p.eliminated),
    [players],
  );

  function equalSplit(ids: string[]): Record<string, number> {
    if (ids.length === 0) return {};
    const each = floorTo(pool / ids.length, CASH_INCREMENT);
    const next = Object.fromEntries(ids.map((id) => [id, each]));
    // Rounding remainder goes to the first player in the group.
    next[ids[0]] = pool - each * (ids.length - 1);
    return next;
  }

  const [mode, setMode] = useState<"winner" | "chop">(
    active.length <= 1 ? "winner" : "chop",
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(active.map((p) => [p.id, true])),
  );
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    equalSplit(active.map((p) => p.id)),
  );

  const chopIds = active.filter((p) => selected[p.id]).map((p) => p.id);
  const allocated = chopIds.reduce((s, id) => s + (amounts[id] ?? 0), 0);
  const remaining = pool - allocated;

  function setEqualShares() {
    if (chopIds.length === 0) return;
    setAmounts({ ...amounts, ...equalSplit(chopIds) });
  }

  function submit() {
    if (mode === "winner") {
      if (active.length !== 1) {
        if (
          !confirm(
            `You're declaring a winner with ${active.length} active players. This will mark the remaining players' seats as won (no payouts for the others). Continue?`,
          )
        ) {
          return;
        }
      }
      finishTournament({ type: "winner" });
    } else {
      if (chopIds.length === 0) {
        alert("Select at least one player for the chop.");
        return;
      }
      if (allocated > pool) {
        alert(
          `Allocated $${allocated.toLocaleString()} exceeds the $${pool.toLocaleString()} prize pool. Reduce the amounts before confirming.`,
        );
        return;
      }
      if (
        remaining > 0 &&
        !confirm(
          `$${remaining.toLocaleString()} of the prize pool is unallocated and will stay unpaid. Continue?`,
        )
      ) {
        return;
      }
      const chopAmounts = Object.fromEntries(
        chopIds.map((id) => [id, amounts[id] ?? 0]),
      );
      finishTournament({
        type: "chop",
        chopPlayerIds: chopIds,
        chopAmounts,
      });
    }
    onClose();
  }

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
            <div className="label">Finish Tournament</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {active.length} active · ${pool.toLocaleString()} pool
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          <button
            className={`btn btn-sm flex-1 ${mode === "winner" ? "btn-primary" : ""}`}
            onClick={() => setMode("winner")}
          >
            Declare Winner
          </button>
          <button
            className={`btn btn-sm flex-1 ${mode === "chop" ? "btn-primary" : ""}`}
            onClick={() => setMode("chop")}
            disabled={active.length < 2}
            title={active.length < 2 ? "Need at least 2 active players" : ""}
          >
            Chop
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {mode === "winner" ? (
            <div className="flex flex-col gap-2 text-sm">
              {active.length === 1 ? (
                <div>
                  <span className="text-[var(--text-muted)]">Winner: </span>
                  <span className="font-semibold">{active[0].name}</span>
                </div>
              ) : active.length === 0 ? (
                <div className="text-[var(--text-muted)] italic">
                  No active players remain.
                </div>
              ) : (
                <div className="text-[var(--text-muted)]">
                  Eliminate players until only one remains, or use Chop to
                  split the pool.
                </div>
              )}
              <div className="text-xs text-[var(--text-muted)]">
                Payouts will be awarded by finish place using the configured
                payout structure.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-xs text-[var(--text-muted)]">
                Select which players are in the chop and enter the dollar
                amount each player gets. Any unallocated money stays unpaid.
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">
                  Prize pool: ${pool.toLocaleString()}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={setEqualShares}
                >
                  Equal split
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {active.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2 rounded bg-black/20"
                  >
                    <input
                      type="checkbox"
                      checked={!!selected[p.id]}
                      onChange={(e) =>
                        setSelected({ ...selected, [p.id]: e.target.checked })
                      }
                    />
                    <span className="flex-1 truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] w-4 text-right">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={pool}
                      step={1}
                      disabled={!selected[p.id]}
                      value={amounts[p.id] ?? 0}
                      onChange={(e) =>
                        setAmounts({
                          ...amounts,
                          [p.id]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="input w-24 text-right font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="text-xs text-[var(--text-muted)] flex items-center justify-between">
                <span>
                  Allocated: ${allocated.toLocaleString()} / $
                  {pool.toLocaleString()}
                </span>
                {remaining > 0 && (
                  <span className="text-orange-400">
                    ${remaining.toLocaleString()} unallocated
                  </span>
                )}
                {remaining < 0 && (
                  <span className="text-red-400">
                    Over by ${(-remaining).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {mode === "winner" ? "Declare Winner" : "Confirm Chop"}
          </button>
        </div>
      </div>
    </div>
  );
}
