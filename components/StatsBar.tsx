"use client";

import { useMemo } from "react";
import { useTournament } from "@/lib/store";
import { computeNextBreak } from "@/lib/selectors";
import { useTournamentStats } from "@/lib/useTournamentStats";
import { fmtDuration } from "@/lib/clock";
import { IconClock, IconCoins, IconLayoutGrid, IconTrophy, IconUsers } from "./icons";

function Stat({
  label,
  value,
  hint,
  icon,
  accent,
  className = "",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`card px-3.5 py-2.5 flex flex-col gap-0.5 min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="label text-[0.625rem]">{label}</div>
        <span className="text-subtle text-[0.8125rem]" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div
        className={`text-xl font-semibold tabular-nums tracking-tight truncate leading-tight ${
          accent ? "text-gold" : ""
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[0.6875rem] text-muted truncate leading-tight">
          {hint}
        </div>
      )}
    </div>
  );
}

export default function StatsBar() {
  const blindStructure = useTournament((s) => s.blindStructure);
  const clock = useTournament((s) => s.clock);
  const stats = useTournamentStats();
  const nextBreak = useMemo(
    () => computeNextBreak(blindStructure, clock.currentLevel, clock.remainingSec),
    [blindStructure, clock.currentLevel, clock.remainingSec],
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
      <Stat
        label="Players"
        icon={<IconUsers />}
        value={`${stats.activeCount} / ${stats.totalPlayers}`}
        hint={`${stats.totalEntries} total entries`}
      />
      <Stat
        label="Prize Pool"
        icon={<IconTrophy />}
        value={`$${stats.prizePool.toLocaleString()}`}
        hint={stats.totalAddOns > 0 ? `${stats.totalAddOns} add-ons in` : undefined}
        accent
      />
      <Stat
        label="Avg Stack"
        icon={<IconLayoutGrid />}
        value={stats.avgStack.toLocaleString()}
        hint={stats.avgBigBlinds > 0 ? `${stats.avgBigBlinds} big blinds` : undefined}
      />
      <Stat
        label="Next Break"
        icon={<IconClock />}
        value={nextBreak ? fmtDuration(nextBreak.secondsAway) : "—"}
        hint={
          nextBreak
            ? nextBreak.levelsAway === 0
              ? "On break now"
              : `${nextBreak.levelsAway} level${nextBreak.levelsAway === 1 ? "" : "s"} away`
            : "No more breaks"
        }
      />
      <Stat
        label="Total Chips"
        icon={<IconCoins />}
        value={stats.totalChips.toLocaleString()}
        className="hidden md:flex"
      />
    </div>
  );
}
