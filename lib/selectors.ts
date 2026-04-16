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

function pickMLevel(
  blindStructure: BlindLevel[],
  currentLevelIdx: number,
): BlindLevel | undefined {
  const cur = blindStructure[currentLevelIdx];
  if (cur && !cur.isBreak) return cur;
  // On a break: prefer the next non-break level (blinds the players will pay).
  for (let i = currentLevelIdx + 1; i < blindStructure.length; i++) {
    if (!blindStructure[i].isBreak) return blindStructure[i];
  }
  // Otherwise fall back to the last non-break level before the break.
  for (let i = currentLevelIdx - 1; i >= 0; i--) {
    if (!blindStructure[i].isBreak) return blindStructure[i];
  }
  return undefined;
}

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
  const mLevel = pickMLevel(blindStructure, currentLevelIdx);
  const costPerOrbit = mLevel
    ? mLevel.smallBlind +
      mLevel.bigBlind +
      mLevel.ante * Math.max(1, active.length)
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
  const buyInSafe = Math.max(0, buyIn);
  const addOnCostSafe = Math.max(0, addOnCost);
  const prizePool = totalEntries * buyInSafe + totalAddOns * addOnCostSafe;
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
  const cur = blindStructure[currentLevelIdx];
  // If we're already on a break, the "next break" is now.
  if (cur?.isBreak) {
    return { levelsAway: 0, secondsAway: remainingSec };
  }
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
