"use client";

import { useState } from "react";
import Link from "next/link";
import { useCash } from "@/lib/cashStore";
import { useCashLiveStats } from "@/lib/cashSelectors";
import { fmtStackWithBBs } from "@/lib/cashStack";
import { fmtMoneyCents } from "@/lib/money";
import CashPlayerRoster from "./CashPlayerRoster";
import EndGameDialog from "./EndGameDialog";
import CashRecap from "./CashRecap";
import { StatTile } from "../StatTiles";

export default function CashDashboardClient() {
  const name = useCash((s) => s.name);
  const smallBlind = useCash((s) => s.smallBlind);
  const players = useCash((s) => s.players);
  const endedAt = useCash((s) => s.endedAt);
  const stats = useCashLiveStats();
  const { bigBlind } = stats;

  const [endOpen, setEndOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-3 md:p-4 min-h-[100dvh]">
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="label">{name}</div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider shrink-0">
                Blinds
              </span>
              <span className="font-mono text-xl font-semibold tabular-nums">
                {fmtMoneyCents(smallBlind)} / {fmtMoneyCents(bigBlind)}
              </span>
            </div>
            {stats.avgActiveStack != null && bigBlind > 0 && (
              <div className="flex items-baseline gap-2">
                <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider shrink-0">
                  Avg stack
                </span>
                <span
                  className="font-mono text-xl font-semibold tabular-nums"
                  data-testid="cash-avg-stack-header"
                >
                  {fmtStackWithBBs(
                    Math.round(stats.avgActiveStack),
                    bigBlind,
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/cash/settings" className="btn">
            Settings
          </Link>
          <button
            className="btn btn-primary"
            onClick={() => setEndOpen(true)}
            disabled={players.length === 0}
            title={
              players.length === 0
                ? "Add a player first"
                : "Settle remaining players and end the game"
            }
          >
            End Game
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatTile label="Players" value={String(stats.totalPlayers)} />
        <StatTile
          label="Active"
          value={`${stats.activeCount} / ${stats.totalPlayers}`}
        />
        <StatTile label="Total in" value={fmtMoneyCents(stats.totalIn)} />
        <StatTile
          label="In play"
          value={fmtMoneyCents(stats.inPlay)}
          hint={
            stats.settledCount > 0
              ? `${fmtMoneyCents(stats.totalOut)} cashed out`
              : undefined
          }
        />
        <div
          data-testid="cash-avg-stack-tile"
          className="col-span-2 sm:col-span-2 lg:col-span-2"
        >
          <StatTile
            label="Avg stack"
            wide
            value={
              stats.avgActiveStack != null && bigBlind > 0
                ? fmtStackWithBBs(Math.round(stats.avgActiveStack), bigBlind)
                : "—"
            }
            hint={
              stats.activeCount === 0 ? "No active players" : undefined
            }
          />
        </div>
      </div>

      <CashPlayerRoster />

      {endOpen && <EndGameDialog onClose={() => setEndOpen(false)} />}

      {endedAt && <CashRecap />}
    </div>
  );
}

