import test from "node:test";
import assert from "node:assert/strict";
import type { CashPlayer } from "./cashTypes";
import {
  avgStackCents,
  fmtBBCount,
  playerStackCents,
  stackBB,
} from "./cashStack";

const BB = 20; // $0.20

function player(
  partial: Partial<CashPlayer> & Pick<CashPlayer, "id" | "name">,
): CashPlayer {
  return {
    buyIns: [{ id: "bi1", amount: 2000, at: 0 }],
    playIntervals: [],
    ...partial,
  };
}

test("playerStackCents uses buy-ins when active and cash-out when settled", () => {
  const active = player({ id: "a", name: "A", buyIns: [{ id: "b", amount: 4000, at: 0 }] });
  assert.equal(playerStackCents(active), 4000);

  const settled = player({
    id: "b",
    name: "B",
    cashOut: { amount: 6500, at: 1 },
  });
  assert.equal(playerStackCents(settled), 6500);
});

test("avgStackCents respects activeOnly", () => {
  const players = [
    player({ id: "a", name: "A", buyIns: [{ id: "b", amount: 4000, at: 0 }] }),
    player({
      id: "b",
      name: "B",
      buyIns: [{ id: "b", amount: 2000, at: 0 }],
      cashOut: { amount: 0, at: 1 },
    }),
  ];
  assert.equal(avgStackCents(players, { activeOnly: true }), 4000);
  assert.equal(avgStackCents(players), 2000);
});

test("stackBB and fmtBBCount", () => {
  assert.equal(stackBB(4000, BB), 200);
  assert.equal(fmtBBCount(200), "200 BB");
  assert.equal(fmtBBCount(87.5), "87.5 BB");
});
