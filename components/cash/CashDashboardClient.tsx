"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCash, totalBuyIns } from "@/lib/cashStore";
import { fmtMoneyCents } from "@/lib/money";
import CashPlayerRoster from "./CashPlayerRoster";
import EndGameDialog from "./EndGameDialog";
import CashRecap from "./CashRecap";

export default function CashDashboardClient() {
  const name = useCash((s) => s.name);
  const smallBlind = useCash((s) => s.smallBlind);
  const bigBlind = useCash((s) => s.bigBlind);
  const players = useCash((s) => s.players);
  const endedAt = useCash((s) => s.endedAt);

  const [endOpen, setEndOpen] = useState(false);

  const stats = useMemo(() => {
    const totalIn = players.reduce((sum, p) => sum + totalBuyIns(p), 0);
    const totalOut = players.reduce(
      (sum, p) => sum + (p.cashOut?.amount ?? 0),
      0,
    );
    const active = players.filter((p) => !p.cashOut);
    const settled = players.filter((p) => !!p.cashOut);
    const inPlay = totalIn - totalOut;
    return {
      totalIn,
      totalOut,
      inPlay,
      activeCount: active.length,
      settledCount: settled.length,
      totalPlayers: players.length,
    };
  }, [players]);

  return (
    <div className="flex flex-col gap-3 p-3 md:p-4 min-h-[100dvh]">
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="label">{name}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider">
              Blinds
            </span>
            <span className="font-mono text-xl font-semibold tabular-nums">
              {fmtMoneyCents(smallBlind)} / {fmtMoneyCents(bigBlind)}
            </span>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
      </div>

      <CashPlayerRoster />

      {endOpen && <EndGameDialog onClose={() => setEndOpen(false)} />}

      {endedAt && <CashRecap />}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div className="text-lg font-semibold font-mono tabular-nums truncate">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-[var(--text-muted)] truncate">
          {hint}
        </div>
      )}
    </div>
  );
}
