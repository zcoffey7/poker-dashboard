import type { BlindLevel, Player, RemovedEntries } from "./types";

export type Stats = {
  activeCount: number;
  totalPlayers: number;
  totalChips: number;
  avgStack: number;
  avgBigBlinds: number;
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

export type ChipSchedule = {
  startingStack?: number;
  rebuyChips?: number;
  addOnChips?: number;
};

export function computeStats(
  players: Player[],
  blindStructure: BlindLevel[],
  currentLevelIdx: number,
  buyIn: number,
  addOnCost = 0,
  chipSchedule: ChipSchedule = {},
  rebuyCost = 0,
  removedEntries?: RemovedEntries,
): Stats {
  const active = players.filter((p) => !p.eliminated);
  // Players removed from the roster mid-tournament already paid; their
  // entries stay in the money counts so the prize pool doesn't silently
  // shrink. Their chips left the table with them, so chip math below uses
  // roster-only counts.
  const removed = removedEntries ?? { buyIns: 0, rebuys: 0, addOns: 0 };
  const rosterRebuys = players.reduce((sum, p) => sum + (p.rebuys ?? 0), 0);
  const rosterAddOns = players.reduce((sum, p) => sum + (p.addOns ?? 0), 0);
  const totalBuyIns = players.length + Math.max(0, removed.buyIns);
  const totalRebuys = rosterRebuys + Math.max(0, removed.rebuys);
  const totalAddOns = rosterAddOns + Math.max(0, removed.addOns);
  // Total chips in play is fixed by buy-ins, rebuys, and add-ons — chips change
  // hands during play but are never created or destroyed (busted players hand
  // their stack to whoever eliminated them). Summing `active[].chips` directly
  // would double-penalize eliminations and keep the average flat instead of
  // letting it climb as the field shrinks.
  const startingStackSafe = Math.max(0, chipSchedule.startingStack ?? 0);
  const rebuyChipsSafe = Math.max(0, chipSchedule.rebuyChips ?? 0);
  const addOnChipsSafe = Math.max(0, chipSchedule.addOnChips ?? 0);
  const totalChips =
    players.length * startingStackSafe +
    rosterRebuys * rebuyChipsSafe +
    rosterAddOns * addOnChipsSafe;
  const avgStack =
    active.length > 0 ? Math.round(totalChips / active.length) : 0;
  const currentLv = blindStructure[currentLevelIdx];
  const mLevel = pickMLevel(blindStructure, currentLevelIdx);
  // Big blind ante structure: exactly one ante is posted per hand (by the BB),
  // not one per player. Over a full orbit, each player is SB once, BB once,
  // and posts the ante once when they're BB — so per-player cost per orbit is
  // simply SB + BB + ante, independent of table size.
  const costPerOrbit = mLevel
    ? mLevel.smallBlind + mLevel.bigBlind + mLevel.ante
    : 0;
  const mRatio =
    costPerOrbit > 0 ? +(avgStack / costPerOrbit).toFixed(1) : 0;
  const avgBigBlinds =
    mLevel && mLevel.bigBlind > 0
      ? Math.round(avgStack / mLevel.bigBlind)
      : 0;
  const totalEntries = totalBuyIns + totalRebuys;
  const buyInSafe = Math.max(0, buyIn);
  const addOnCostSafe = Math.max(0, addOnCost);
  const rebuyCostSafe = Math.max(0, rebuyCost);
  // Price entries, rebuys, and add-ons separately so the rebuy dollar amount
  // (configurable in settings) drives the prize pool independently of the
  // initial buy-in.
  const prizePool =
    totalBuyIns * buyInSafe +
    totalRebuys * rebuyCostSafe +
    totalAddOns * addOnCostSafe;
  return {
    activeCount: active.length,
    totalPlayers: players.length,
    totalChips,
    avgStack,
    avgBigBlinds,
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
