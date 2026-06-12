import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCashPayouts,
  computeChopAmounts,
  floorTo,
  CASH_INCREMENT,
} from "./payouts.ts";

test("floorTo snaps down to increment", () => {
  assert.equal(floorTo(47, 5), 45);
  assert.equal(floorTo(50, 5), 50);
});

test("computeCashPayouts floors to $5 and assigns dust to 1st", () => {
  const { amounts, paidTotal } = computeCashPayouts(
    [
      { place: 1, percent: 60 },
      { place: 2, percent: 30 },
      { place: 3, percent: 10 },
    ],
    100,
  );
  assert.equal(amounts[1] + amounts[2] + amounts[3], paidTotal);
  assert.equal(paidTotal % CASH_INCREMENT, 0);
  assert.ok(amounts[1] >= amounts[2]);
});

test("computeChopAmounts mirrors payout dust-to-first rule", () => {
  const amounts = computeChopAmounts(
    { a: 50, b: 50 },
    100,
  );
  assert.equal(amounts.a + amounts.b, 100);
  assert.equal(amounts.a % CASH_INCREMENT, 0);
  assert.equal(amounts.b % CASH_INCREMENT, 0);
});
