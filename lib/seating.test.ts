import { test } from "node:test";
import assert from "node:assert/strict";
import { randomAssign } from "./seating";
import type { Player, Table } from "./types";

const tables: Table[] = [
  { id: "t1", name: "Table 1", seatCount: 3 },
  { id: "t2", name: "Table 2", seatCount: 3 },
];

function player(id: string, eliminated = false): Player {
  return {
    id,
    name: id,
    tableId: null,
    seat: null,
    chips: 1000,
    rebuys: 0,
    addOns: 0,
    eliminated,
  };
}

test("randomAssign is deterministic with a seed", () => {
  const roster = [player("a"), player("b"), player("c"), player("d")];
  const a = randomAssign(roster, tables, "spread", 42);
  const b = randomAssign(roster, tables, "spread", 42);
  assert.deepEqual(
    a.map((p) => [p.id, p.tableId, p.seat]),
    b.map((p) => [p.id, p.tableId, p.seat]),
  );
});

test("randomAssign skips eliminated players", () => {
  const roster = [player("a"), player("b", true), player("c")];
  const assigned = randomAssign(roster, tables, "fill", 1);
  const eliminated = assigned.find((p) => p.id === "b");
  assert.equal(eliminated?.tableId, null);
  assert.equal(eliminated?.seat, null);
});
