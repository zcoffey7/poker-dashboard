"use client";

import { useEffect } from "react";
import { useTournament } from "./store";

export function useClockTick() {
  useEffect(() => {
    const id = setInterval(() => {
      useTournament.getState().tick();
    }, 1000);
    return () => clearInterval(id);
  }, []);
}

export function fmtTime(totalSec: number): string {
  if (totalSec < 0) totalSec = 0;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Compact duration formatter.
 * < 1 hour  -> "MM:SS"  (e.g. "45:30")
 * >= 1 hour -> "1hr 10m" (never "70:00")
 */
export function fmtDuration(totalSec: number): string {
  if (totalSec < 0) totalSec = 0;
  if (totalSec < 3600) return fmtTime(totalSec);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return m > 0 ? `${h}hr ${m}m` : `${h}hr`;
}
