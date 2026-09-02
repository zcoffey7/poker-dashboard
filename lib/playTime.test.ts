import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fmtPlayedClock,
  hasOpenInterval,
  migrateCashIntervals,
  migrateTournamentIntervals,
  playedMs,
  playedSec,
  playedSecOrNull,
  startPlay,
  stopPlay,
} from "./playTime";

const T0 = 1_000_000;
const MIN = 60_000;

test("startPlay opens a stint and is idempotent while seated", () => {
  const first = startPlay([], T0);
  assert.deepEqual(first, [{ startedAt: T0 }]);
  assert.equal(hasOpenInterval(first), true);
  assert.deepEqual(startPlay(first, T0 + MIN), first);
});

test("stopPlay closes the open stint and is idempotent", () => {
  const open = startPlay([], T0);
  const closed = stopPlay(open, T0 + 5 * MIN);
  assert.deepEqual(closed, [{ startedAt: T0, endedAt: T0 + 5 * MIN }]);
  assert.equal(hasOpenInterval(closed), false);
  assert.deepEqual(stopPlay(closed, T0 + 10 * MIN), closed);
});

test("playedMs sums seated time and skips gaps between stints", () => {
  const intervals = [
    { startedAt: T0, endedAt: T0 + 10 * MIN },
    { startedAt: T0 + 20 * MIN, endedAt: T0 + 25 * MIN },
  ];
  // 10 min + 5 min; the 10 min they were cashed out is excluded.
  assert.equal(playedMs(intervals, T0 + 40 * MIN), 15 * MIN);
  assert.equal(playedSec(intervals, T0 + 40 * MIN), 15 * 60);
});

test("playedMs keeps counting an open stint against `now`", () => {
  const open = [{ startedAt: T0 }];
  assert.equal(playedMs(open, T0 + 90_000), 90_000);
  assert.equal(playedSec(open, T0 + 90_000), 90);
});

test("playedSecOrNull is null until a stint exists", () => {
  assert.equal(playedSecOrNull(undefined, T0), null);
  assert.equal(playedSecOrNull([], T0), null);
  assert.equal(playedSecOrNull([{ startedAt: T0 }], T0 + 1000), 1);
});

test("stop then start models a cash-out and rejoin", () => {
  const seated = startPlay([], T0);
  const left = stopPlay(seated, T0 + 8 * MIN);
  const back = startPlay(left, T0 + 30 * MIN);
  assert.equal(playedMs(back, T0 + 40 * MIN), 8 * MIN + 10 * MIN);
});

test("fmtPlayedClock always shows seconds", () => {
  assert.equal(fmtPlayedClock(0), "00:00");
  assert.equal(fmtPlayedClock(5), "00:05");
  assert.equal(fmtPlayedClock(65), "01:05");
  assert.equal(fmtPlayedClock(3600), "1:00:00");
  assert.equal(fmtPlayedClock(3661), "1:01:01");
  assert.equal(fmtPlayedClock(-3), "00:00");
});

test("migrateCashIntervals uses first buy-in and cash-out", () => {
  const active = migrateCashIntervals({
    buyIns: [{ at: T0 }],
  });
  assert.deepEqual(active, [{ startedAt: T0, endedAt: undefined }]);

  const settled = migrateCashIntervals({
    buyIns: [{ at: T0 }, { at: T0 + MIN }],
    cashOut: { at: T0 + 12 * MIN },
  });
  assert.deepEqual(settled, [{ startedAt: T0, endedAt: T0 + 12 * MIN }]);
});

test("migrateCashIntervals keeps already-stored intervals", () => {
  const existing = [{ startedAt: 1, endedAt: 2 }];
  assert.equal(
    migrateCashIntervals({
      buyIns: [{ at: T0 }],
      playIntervals: existing,
    }),
    existing,
  );
});

test("migrateTournamentIntervals uses start, elimination, and finish", () => {
  assert.deepEqual(migrateTournamentIntervals({}, undefined, T0), []);

  const stillIn = migrateTournamentIntervals({}, T0, undefined);
  assert.deepEqual(stillIn, [{ startedAt: T0, endedAt: undefined }]);

  const busted = migrateTournamentIntervals(
    { eliminatedAt: T0 + 5 * MIN },
    T0,
    T0 + 20 * MIN,
  );
  assert.deepEqual(busted, [{ startedAt: T0, endedAt: T0 + 5 * MIN }]);

  const winner = migrateTournamentIntervals({}, T0, T0 + 20 * MIN);
  assert.deepEqual(winner, [{ startedAt: T0, endedAt: T0 + 20 * MIN }]);
});
