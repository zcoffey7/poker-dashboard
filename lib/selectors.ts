import type { BlindLevel, Player } from "./types";

export type Stats = {
  activeCount: number;
  totalPlayers: number;
  totalChips: number;
  avgStack: number;
  mRatio: number;
  prizePool: number;
  totalEntries: number;
  totalAddOns: number;
  currentLevel: BlindLevel | undefined;
  nextLevel: BlindLevel | undefined;
};

export function computeStats(
  players: Player[],
  blindStructure: BlindLevel[],
  currentLevelIdx: number,
  buyIn: number,
  addOnCost = 0,
): Stats {
  const active = players.filter((p) => !p.eliminated);
  const totalChips = active.reduce((sum, p) => sum + p.chips, 0);
  const avgStack =
    active.length > 0 ? Math.round(totalChips / active.length) : 0;
  const currentLv = blindStructure[currentLevelIdx];
  const costPerOrbit = currentLv
    ? currentLv.smallBlind +
      currentLv.bigBlind +
      currentLv.ante * Math.max(1, active.length)
    : 0;
  const mRatio =
    costPerOrbit > 0 ? +(avgStack / costPerOrbit).toFixed(1) : 0;
  const totalEntries = players.reduce(
    (sum, p) => sum + 1 + (p.rebuys ?? 0),
    0,
  );
  const totalAddOns = players.reduce(
    (sum, p) => sum + (p.addOns ?? 0),
    0,
  );
  const prizePool = totalEntries * buyIn + totalAddOns * addOnCost;
  return {
    activeCount: active.length,
    totalPlayers: players.length,
    totalChips,
    avgStack,
    mRatio,
    prizePool,
    totalEntries,
    totalAddOns,
    currentLevel: currentLv,
    nextLevel: blindStructure[currentLevelIdx + 1],
  };
}

export function computeNextBreak(
  blindStructure: BlindLevel[],
  currentLevelIdx: number,
  remainingSec: number,
): { levelsAway: number; secondsAway: number } | null {
  let secs = remainingSec;
  for (let i = currentLevelIdx + 1; i < blindStructure.length; i++) {
    const lv = blindStructure[i];
    if (lv.isBreak) {
      return { levelsAway: i - currentLevelIdx, secondsAway: secs };
    }
    secs += lv.durationSec;
  }
  return null;
}
