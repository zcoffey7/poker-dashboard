"use client";

import { useShallow } from "zustand/react/shallow";
import { useCash, totalBuyIns } from "./cashStore";
import type { CashPlayer } from "./cashTypes";
import { avgStackCents } from "./cashStack";

export type CashLiveStats = {
  totalIn: number;
  totalOut: number;
  inPlay: number;
  activeCount: number;
  settledCount: number;
  totalPlayers: number;
  avgActiveStack: number | null;
};

/** Derive live dashboard totals from the current player list. */
export function computeCashLiveStats(
  players: readonly CashPlayer[],
): CashLiveStats {
  const totalIn = players.reduce((sum, p) => sum + totalBuyIns(p), 0);
  const totalOut = players.reduce(
    (sum, p) => sum + (p.cashOut?.amount ?? 0),
    0,
  );
  const activeCount = players.filter((p) => !p.cashOut).length;
  return {
    totalIn,
    totalOut,
    inPlay: totalIn - totalOut,
    activeCount,
    settledCount: players.length - activeCount,
    totalPlayers: players.length,
    avgActiveStack: avgStackCents(players, { activeOnly: true }),
  };
}

/**
 * Live dashboard stats. Subscribes to the full player list and recomputes
 * whenever any buy-in, rebuy, cash-out, or roster change occurs.
 */
export function useCashLiveStats(): CashLiveStats & { bigBlind: number } {
  return useCash(
    useShallow((s) => ({
      ...computeCashLiveStats(s.players),
      bigBlind: s.bigBlind,
    })),
  );
}

/** Subscribe to one player; re-renders when that player's stack changes. */
export function useCashPlayer(playerId: string): CashPlayer | undefined {
  return useCash(
    useShallow((s) => s.players.find((p) => p.id === playerId)),
  );
}
