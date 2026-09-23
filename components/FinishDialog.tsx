"use client";

import { useId, useMemo, useState } from "react";
import ModalShell, { ModalFooter, ModalHeader } from "./ModalShell";
import { useTournament } from "@/lib/store";
import { useTournamentStats } from "@/lib/useTournamentStats";
import { confirmAction, showNotice } from "@/lib/confirm";
import { CASH_INCREMENT, floorTo } from "@/lib/payouts";
import { IconTrophy, IconUsers } from "./icons";

type Props = {
  onClose: () => void;
};

export default function FinishDialog({ onClose }: Props) {
  const players = useTournament((s) => s.players);
  const finishTournament = useTournament((s) => s.finishTournament);
  const titleId = useId();

  const pool = useTournamentStats().prizePool;

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

  async function submit() {
    if (mode === "winner") {
      if (active.length !== 1) {
        const ok = await confirmAction({
          title: "Declare a winner now?",
          message: `${active.length} players are still active. Declaring a winner ends the tournament and assigns their finish places automatically.`,
          confirmLabel: "Declare winner",
        });
        if (!ok) return;
      }
      finishTournament({ type: "winner" });
    } else {
      if (chopIds.length === 0) {
        await showNotice("Select at least one player for the chop.");
        return;
      }
      if (allocated > pool) {
        await showNotice(
          "Chop is over the prize pool",
          `Allocated $${allocated.toLocaleString()} exceeds the $${pool.toLocaleString()} prize pool. Reduce the amounts before confirming.`,
        );
        return;
      }
      if (remaining > 0) {
        const ok = await confirmAction({
          title: "Leave money unallocated?",
          message: `$${remaining.toLocaleString()} of the prize pool is unallocated and will stay unpaid.`,
          confirmLabel: "Confirm chop",
        });
        if (!ok) return;
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

  const allocatedPct = pool > 0 ? Math.min(100, (allocated / pool) * 100) : 0;
  const meterColor =
    remaining === 0 ? "bg-primary" : remaining < 0 ? "bg-loss" : "bg-warn";

  return (
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
    >
      <ModalHeader
        titleId={titleId}
        title="Finish Tournament"
        subtitle={
          <span className="tabular-nums">
            {active.length} active ·{" "}
            <span className="text-gold font-medium">${pool.toLocaleString()}</span>{" "}
            pool
          </span>
        }
        onClose={onClose}
      />

      <div className="px-5 pt-4">
        <div className="segmented w-full">
          <button
            type="button"
            aria-pressed={mode === "winner"}
            onClick={() => setMode("winner")}
          >
            <IconTrophy />
            Declare Winner
          </button>
          <button
            type="button"
            aria-pressed={mode === "chop"}
            onClick={() => setMode("chop")}
            disabled={active.length < 2}
            title={active.length < 2 ? "Need at least 2 active players" : ""}
          >
            <IconUsers />
            Chop
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {mode === "winner" ? (
          <div className="flex flex-col gap-3 text-sm">
            {active.length === 1 ? (
              <div className="card-2 flex items-center gap-3 p-4 border-gold/40">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-gold/15 text-gold text-lg">
                  <IconTrophy />
                </span>
                <div>
                  <div className="label">Winner</div>
                  <div className="text-lg font-semibold">{active[0].name}</div>
                </div>
              </div>
            ) : active.length === 0 ? (
              <div className="text-muted italic">No active players remain.</div>
            ) : (
              <div className="text-muted leading-relaxed">
                Eliminate players until only one remains, or use Chop to
                split the pool.
              </div>
            )}
            <div className="text-xs text-muted">
              Payouts will be awarded by finish place using the configured
              payout structure.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-muted leading-relaxed">
                Select who&apos;s in the chop and enter each player&apos;s
                amount. Any unallocated money stays unpaid.
              </p>
              <button
                type="button"
                className="btn btn-sm shrink-0"
                onClick={setEqualShares}
              >
                Equal split
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {active.map((p) => (
                <label
                  key={p.id}
                  className={`card-2 flex items-center gap-3 px-3 py-2 cursor-pointer transition-opacity ${
                    selected[p.id] ? "" : "opacity-55"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[p.id]}
                    aria-label={`Include ${p.name} in chop`}
                    onChange={(e) =>
                      setSelected({ ...selected, [p.id]: e.target.checked })
                    }
                  />
                  <span className="flex-1 truncate text-sm font-medium">
                    {p.name}
                  </span>
                  <span className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={pool}
                      step={1}
                      disabled={!selected[p.id]}
                      value={amounts[p.id] ?? 0}
                      aria-label={`Chop amount for ${p.name}`}
                      onChange={(e) =>
                        setAmounts({
                          ...amounts,
                          [p.id]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="input input-sm w-28 pl-6 text-right tabular-nums"
                    />
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${meterColor}`}
                  style={{ width: `${allocatedPct}%` }}
                />
              </div>
              <div className="text-xs flex items-center justify-between tabular-nums">
                <span className="text-muted">
                  Allocated ${allocated.toLocaleString()} of $
                  {pool.toLocaleString()}
                </span>
                {remaining > 0 && (
                  <span className="text-warn font-medium">
                    ${remaining.toLocaleString()} unallocated
                  </span>
                )}
                {remaining < 0 && (
                  <span className="text-loss font-medium">
                    Over by ${(-remaining).toLocaleString()}
                  </span>
                )}
                {remaining === 0 && (
                  <span className="text-primary font-medium">Fully allocated</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={submit}>
          {mode === "winner" ? "Declare Winner" : "Confirm Chop"}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}
