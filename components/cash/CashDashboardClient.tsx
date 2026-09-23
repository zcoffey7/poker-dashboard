"use client";

import { useState } from "react";
import { useCash } from "@/lib/cashStore";
import { useCashLiveStats } from "@/lib/cashSelectors";
import { fmtBBCount, stackBB } from "@/lib/cashStack";
import { fmtMoneyCents } from "@/lib/money";
import { useHasHydrated } from "@/lib/useHasHydrated";
import CashPlayerRoster from "./CashPlayerRoster";
import EndGameDialog from "./EndGameDialog";
import CashRecap from "./CashRecap";
import { IconFlag } from "../icons";

export default function CashDashboardClient() {
  // Everything here reads persisted state; hold a skeleton until it's loaded
  // so the static HTML never flashes an empty default game.
  const hydrated = useHasHydrated(useCash);
  if (!hydrated) return <CashSkeleton />;
  return <CashDashboard />;
}

function CashDashboard() {
  const smallBlind = useCash((s) => s.smallBlind);
  const players = useCash((s) => s.players);
  const endedAt = useCash((s) => s.endedAt);
  const stats = useCashLiveStats();
  const { bigBlind } = stats;

  const [endOpen, setEndOpen] = useState(false);

  const endDisabled = players.length === 0;
  const endTitle =
    players.length === 0
      ? "Add a player first"
      : "Settle remaining players and end the game";

  const avg = stats.avgActiveStack != null ? Math.round(stats.avgActiveStack) : null;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-3 p-3 pb-action-bar sm:p-5 md:pb-6">
      <section className="card relative overflow-hidden p-4 sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full blur-3xl"
          style={{ background: "var(--glow-1)" }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="label">In play</div>
            <div className="mt-0.5 text-[2.5rem] leading-none font-semibold tabular-nums tracking-tight">
              {fmtMoneyCents(stats.inPlay)}
            </div>
            <div className="mt-2 text-sm text-muted tabular-nums">
              {fmtMoneyCents(stats.totalIn)} in
              {stats.settledCount > 0 && (
                <> · {fmtMoneyCents(stats.totalOut)} out</>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="text-right">
              <div className="label">Blinds</div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums">
                {fmtMoneyCents(smallBlind)} / {fmtMoneyCents(bigBlind)}
              </div>
            </div>
            <button
              className="btn btn-primary hidden md:inline-flex"
              onClick={() => setEndOpen(true)}
              disabled={endDisabled}
              title={endTitle}
            >
              <IconFlag />
              End Game
            </button>
          </div>
        </div>

        <div className="relative mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
          <div>
            <div className="label">Seated</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">
              {stats.activeCount}
              <span className="text-sm font-normal text-muted">
                {" "}
                of {stats.totalPlayers}
              </span>
            </div>
          </div>
          <div data-testid="cash-avg-stack-tile" className="min-w-0">
            <div className="label">Avg stack</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums truncate">
              {avg != null && bigBlind > 0 ? (
                <>
                  {fmtMoneyCents(avg)}
                  <span className="text-sm font-normal text-muted">
                    {" · "}
                    {fmtBBCount(stackBB(avg, bigBlind))}
                  </span>
                </>
              ) : (
                "—"
              )}
            </div>
            {stats.activeCount === 0 && (
              <div className="text-xs text-muted">No active players</div>
            )}
          </div>
        </div>
      </section>

      <CashPlayerRoster />

      <div className="action-bar md:hidden">
        <button
          className="btn btn-primary btn-lg w-full"
          onClick={() => setEndOpen(true)}
          disabled={endDisabled}
          title={endTitle}
        >
          <IconFlag />
          End Game
        </button>
      </div>

      {endOpen && <EndGameDialog onClose={() => setEndOpen(false)} />}

      {endedAt && <CashRecap />}
    </div>
  );
}

function CashSkeleton() {
  return (
    <div
      className="w-full max-w-3xl mx-auto flex flex-col gap-3 p-3 sm:p-5"
      aria-busy="true"
      aria-label="Loading cash game"
    >
      <div className="card h-48 animate-pulse" />
      <div className="card h-80 animate-pulse" />
    </div>
  );
}
