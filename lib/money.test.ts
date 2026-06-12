import { test } from "node:test";
import assert from "node:assert/strict";
import { toCents, fromCents, fmtMoneyCents, fmtSignedCents } from "./money";

test("toCents rounds dollars to integer cents", () => {
  assert.equal(toCents(20), 2000);
  assert.equal(toCents(19.995), 2000);
  assert.equal(toCents(0.1), 10);
});

test("toCents collapses non-finite input to 0", () => {
  assert.equal(toCents(Number.NaN), 0);
  assert.equal(toCents(Number.POSITIVE_INFINITY), 0);
});

test("fromCents converts back to dollars", () => {
  assert.equal(fromCents(2000), 20);
  assert.equal(fromCents(0), 0);
});

test("fmtMoneyCents and fmtSignedCents format USD", () => {
  assert.equal(fmtMoneyCents(2000), "$20.00");
  assert.equal(fmtSignedCents(150), "+$1.50");
  assert.equal(fmtSignedCents(-150), "−$1.50");
  assert.equal(fmtSignedCents(0), "$0.00");
});
