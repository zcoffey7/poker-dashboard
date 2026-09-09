import test from "node:test";
import assert from "node:assert/strict";
import type { CashPlayer } from "./cashTypes";
import { computeCashLiveStats } from "./cashSelectors";

function player(
  partial: Partial<CashPlayer> & Pick<CashPlayer, "id" | "name">,
): CashPlayer {
  return {
    buyIns: [{ id: "bi1", amount: 2000, at: 0 }],
    playIntervals: [],
    ...partial,
  };
}

test("computeCashLiveStats updates when roster and stacks change", () => {
  let players = [player({ id: "a", name: "Alice" })];
  let stats = computeCashLiveStats(players);
  assert.equal(stats.totalPlayers, 1);
  assert.equal(stats.avgActiveStack, 2000);

  players = [
    ...players,
    player({
      id: "b",
      name: "Bob",
      buyIns: [{ id: "bi2", amount: 4000, at: 0 }],
    }),
  ];
  stats = computeCashLiveStats(players);
  assert.equal(stats.avgActiveStack, 3000);

  players = players.map((p) =>
    p.id === "a"
      ? {
          ...p,
          buyIns: [
            ...p.buyIns,
            { id: "bi3", amount: 2000, at: 1 },
          ],
        }
      : p,
  );
  stats = computeCashLiveStats(players);
  assert.equal(stats.avgActiveStack, 4000);

  players = players.map((p) =>
    p.id === "b"
      ? { ...p, cashOut: { amount: 6000, at: 2 } }
      : p,
  );
  stats = computeCashLiveStats(players);
  assert.equal(stats.activeCount, 1);
  assert.equal(stats.avgActiveStack, 4000);
});
