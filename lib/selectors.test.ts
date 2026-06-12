import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStats, computeNextBreak } from "./selectors";
import type { BlindLevel, Player } from "./types";

const levels: BlindLevel[] = [
  {
    id: "bl_1",
    level: 1,
    smallBlind: 100,
    bigBlind: 200,
    ante: 0,
    durationSec: 1200,
  },
  {
    id: "bl_2",
    level: 2,
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    durationSec: 600,
    isBreak: true,
  },
  {
    id: "bl_3",
    level: 3,
    smallBlind: 200,
    bigBlind: 400,
    ante: 0,
    durationSec: 1200,
  },
];

const players: Player[] = [
  {
    id: "p1",
    name: "A",
    tableId: null,
    seat: null,
    chips: 30000,
    rebuys: 1,
    addOns: 0,
    eliminated: false,
  },
  {
    id: "p2",
    name: "B",
    tableId: null,
    seat: null,
    chips: 0,
    rebuys: 0,
    addOns: 1,
    eliminated: true,
  },
];

test("computeStats includes removed entries in prize pool", () => {
  const stats = computeStats(
    players,
    levels,
    0,
    20,
    10,
    { startingStack: 30000, rebuyChips: 30000, addOnChips: 25000 },
    20,
    { buyIns: 1, rebuys: 2, addOns: 1 },
  );
  // 2 roster + 1 removed buy-ins, 1 roster + 2 removed rebuys, 1 roster + 1 removed add-on
  assert.equal(stats.prizePool, 3 * 20 + 3 * 20 + 2 * 10);
  assert.equal(stats.totalPlayers, 2);
  assert.equal(stats.activeCount, 1);
});

test("computeNextBreak skips to the next break level", () => {
  const next = computeNextBreak(levels, 0, 300);
  assert.deepEqual(next, { levelsAway: 1, secondsAway: 300 });
});
