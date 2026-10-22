import { test } from "node:test";
import assert from "node:assert/strict";
import { upcomingChimes } from "./chimes";
import type { BlindLevel, ClockState } from "./types";

const T0 = 1_000_000;
const MIN = 60_000;

function level(minutes: number, i = 0): BlindLevel {
  return {
    id: `bl_${i}`,
    level: i + 1,
    smallBlind: 100,
    bigBlind: 200,
    ante: 0,
    durationSec: minutes * 60,
  };
}

function structure(...minutes: number[]): BlindLevel[] {
  return minutes.map((m, i) => level(m, i));
}

function runningClock(overrides: Partial<ClockState> = {}): ClockState {
  return {
    currentLevel: 0,
    remainingSec: 20 * 60,
    running: true,
    lastTickAt: T0,
    levelStartedAt: T0,
    ...overrides,
  };
}

test("a paused clock has nothing to chime", () => {
  assert.deepEqual(
    upcomingChimes(runningClock({ running: false }), structure(20), 60, T0),
    [],
  );
});

test("warns before and chimes at the end of every remaining level", () => {
  assert.deepEqual(upcomingChimes(runningClock(), structure(20, 20, 10), 60, T0), [
    { kind: "warning", at: T0 + 19 * MIN },
    { kind: "levelUp", at: T0 + 20 * MIN },
    { kind: "warning", at: T0 + 39 * MIN },
    { kind: "levelUp", at: T0 + 40 * MIN },
    { kind: "warning", at: T0 + 49 * MIN },
    { kind: "levelUp", at: T0 + 50 * MIN },
  ]);
});

test("starts from the current level and drops chimes already passed", () => {
  const clock = runningClock({ currentLevel: 1 });
  const now = T0 + 19.5 * MIN;
  assert.deepEqual(upcomingChimes(clock, structure(5, 20, 10), 60, now), [
    { kind: "levelUp", at: T0 + 20 * MIN },
    { kind: "warning", at: T0 + 29 * MIN },
    { kind: "levelUp", at: T0 + 30 * MIN },
  ]);
});

test("levels no longer than the warning window get no warning", () => {
  assert.deepEqual(upcomingChimes(runningClock(), structure(1, 0.5), 60, T0), [
    { kind: "levelUp", at: T0 + MIN },
    { kind: "levelUp", at: T0 + 1.5 * MIN },
  ]);
});

test("a zero warning threshold turns warnings off", () => {
  assert.deepEqual(upcomingChimes(runningClock(), structure(20), 0, T0), [
    { kind: "levelUp", at: T0 + 20 * MIN },
  ]);
});

test("zero-length levels roll into a single level-up", () => {
  const chimes = upcomingChimes(runningClock(), structure(20, 0, 0, 20), 60, T0);
  assert.deepEqual(
    chimes.filter((c) => c.kind === "levelUp").map((c) => c.at),
    [T0 + 20 * MIN, T0 + 40 * MIN],
  );
});

test("derives the level start from remainingSec when levelStartedAt is missing", () => {
  const clock = runningClock({ levelStartedAt: null, remainingSec: 5 * 60 });
  assert.deepEqual(upcomingChimes(clock, structure(20), 60, T0), [
    { kind: "warning", at: T0 + 4 * MIN },
    { kind: "levelUp", at: T0 + 5 * MIN },
  ]);
});

test("treats a level start ahead of the wall clock as starting now", () => {
  const clock = runningClock({ levelStartedAt: T0 + 5 * MIN });
  assert.deepEqual(upcomingChimes(clock, structure(20), 60, T0), [
    { kind: "warning", at: T0 + 19 * MIN },
    { kind: "levelUp", at: T0 + 20 * MIN },
  ]);
});

test("an out-of-range level has nothing to chime", () => {
  assert.deepEqual(
    upcomingChimes(runningClock({ currentLevel: 3 }), structure(20), 60, T0),
    [],
  );
});
