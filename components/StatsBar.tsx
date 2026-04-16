"use client";

import { useMemo } from "react";
import { useTournament } from "@/lib/store";
import { computeStats, computeNextBreak } from "@/lib/selectors";
import { fmtTime } from "@/lib/clock";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card px-3 py-2 flex flex-col gap-0.5 min-w-0">
      <div className="label text-[10px]">{label}</div>
      <div className="text-lg font-semibold truncate leading-tight">{value}</div>
      {hint && (
        <div className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
          {hint}
        </div>
      )}
    </div>
  );
}

export default function StatsBar() {
  const players = useTournament((s) => s.players);
  const blindStructure = useTournament((s) => s.blindStructure);
  const clock = useTournament((s) => s.clock);
  const buyIn = useTournament((s) => s.buyIn);
  const addOnCost = useTournament((s) => s.addOnCost);

  const stats = useMemo(
    () =>
      computeStats(
        players,
        blindStructure,
        clock.currentLevel,
        buyIn,
        addOnCost,
      ),
    [players, blindStructure, clock.currentLevel, buyIn, addOnCost],
  );
  const nextBreak = useMemo(
    () => computeNextBreak(blindStructure, clock.currentLevel, clock.remainingSec),
    [blindStructure, clock.currentLevel, clock.remainingSec],
  );

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      <Stat
        label="Players"
        value={`${stats.activeCount} / ${stats.totalPlayers}`}
        hint={`${stats.totalEntries} total entries`}
      />
      <Stat
        label="Total Chips"
        value={stats.totalChips.toLocaleString()}
      />
      <Stat
        label="Avg Stack"
        value={stats.avgStack.toLocaleString()}
        hint={stats.mRatio > 0 ? `M: ${stats.mRatio}` : undefined}
      />
      <Stat
        label="Prize Pool"
        value={`$${stats.prizePool.toLocaleString()}`}
      />
      <Stat
        label="Next Break"
        value={
          nextBreak
            ? fmtTime(nextBreak.secondsAway)
            : "—"
        }
        hint={
          nextBreak
            ? `${nextBreak.levelsAway} level${nextBreak.levelsAway === 1 ? "" : "s"} away`
            : "No more breaks"
        }
      />
      <Stat
        label="Level"
        value={
          stats.currentLevel
            ? stats.currentLevel.isBreak
              ? "BREAK"
              : `${stats.currentLevel.smallBlind.toLocaleString()}/${stats.currentLevel.bigBlind.toLocaleString()}`
            : "—"
        }
        hint={
          stats.currentLevel?.ante
            ? `Ante ${stats.currentLevel.ante.toLocaleString()}`
            : undefined
        }
      />
    </div>
  );
}
