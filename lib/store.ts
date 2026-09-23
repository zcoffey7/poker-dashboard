"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  BlindLevel,
  ChipDenom,
  FinishType,
  PayoutSpot,
  Player,
  RebalanceMove,
  Table,
  TournamentSettings,
  TournamentState,
} from "./types";
import {
  DEFAULT_ADD_ON_CHIPS,
  DEFAULT_ADD_ON_COST,
  DEFAULT_BLIND_STRUCTURE,
  DEFAULT_BUY_IN,
  DEFAULT_CHIP_DENOMS,
  DEFAULT_PAYOUTS,
  DEFAULT_REBUY_CHIPS,
  DEFAULT_REBUY_COST,
  DEFAULT_SETTINGS,
  DEFAULT_STARTING_STACK,
  DEFAULT_TABLES,
  DEFAULT_TOURNAMENT_NAME,
} from "./defaults";
import { newBlindLevelId } from "./blindLevelId";
import { balanceTables, randomAssign } from "./seating";
import { playLevelUp, playWarning } from "./clock";
import { uid } from "./id";
import {
  migrateTournamentIntervals,
  startPlay,
  stopPlay,
} from "./playTime";

function ensureBlindLevelIds(levels: BlindLevel[]): BlindLevel[] {
  return levels.map((lv) => ({
    ...lv,
    id: lv.id ?? newBlindLevelId(),
  }));
}

function startActivePlay(players: Player[], now: number): Player[] {
  return players.map((p) =>
    p.eliminated ? p : { ...p, playIntervals: startPlay(p.playIntervals, now) },
  );
}

function stopAllPlay(players: Player[], now: number): Player[] {
  return players.map((p) => ({
    ...p,
    playIntervals: stopPlay(p.playIntervals, now),
  }));
}

/**
 * Compare two player lists from before/after `balanceTables` and emit a
 * `RebalanceMove` for every living player whose table or seat changed.
 * Uses `tablesAfter` so table names + broken-status reflect the post-balance
 * world, which is what we want to show in the popup.
 */
function diffSeating(
  before: Player[],
  after: Player[],
  tablesBefore: Table[],
  tablesAfter: Table[],
): RebalanceMove[] {
  const beforeById = new Map(before.map((p) => [p.id, p]));
  const tableBeforeById = new Map(tablesBefore.map((t) => [t.id, t]));
  const tableAfterById = new Map(tablesAfter.map((t) => [t.id, t]));

  const moves: RebalanceMove[] = [];
  for (const p of after) {
    if (p.eliminated) continue;
    const prev = beforeById.get(p.id);
    if (!prev) continue;
    if (prev.tableId === p.tableId && prev.seat === p.seat) continue;
    if (p.tableId == null || p.seat == null) continue;

    const toTable = tableAfterById.get(p.tableId);
    if (!toTable) continue;

    const fromTable =
      prev.tableId != null ? tableBeforeById.get(prev.tableId) : undefined;
    const fromBrokenNow =
      prev.tableId != null
        ? (tableAfterById.get(prev.tableId)?.broken ?? false)
        : false;

    moves.push({
      playerId: p.id,
      playerName: p.name,
      fromTableId: prev.tableId,
      fromTableName: fromTable?.name ?? null,
      fromSeat: prev.seat,
      toTableId: p.tableId,
      toTableName: toTable.name,
      toSeat: p.seat,
      reason: fromBrokenNow ? "break" : "balance",
    });
  }
  return moves;
}

/**
 * After a table's seatCount shrinks, players can be left sitting in seats
 * that no longer exist (`movePlayer` validates new moves but existing
 * assignments were untouched). Move each overflow player to the lowest open
 * seat at their table, or unseat them when the table is genuinely full.
 */
function clampSeatsToTables(players: Player[], tables: Table[]): Player[] {
  const capById = new Map(tables.map((t) => [t.id, t.seatCount]));
  const taken = new Map<string, Set<number>>();
  for (const p of players) {
    if (p.eliminated || p.tableId == null || p.seat == null) continue;
    const cap = capById.get(p.tableId);
    if (cap == null || p.seat > cap) continue;
    let seats = taken.get(p.tableId);
    if (!seats) {
      seats = new Set();
      taken.set(p.tableId, seats);
    }
    seats.add(p.seat);
  }
  let changed = false;
  const next = players.map((p) => {
    if (p.eliminated || p.tableId == null || p.seat == null) return p;
    const cap = capById.get(p.tableId);
    if (cap == null || p.seat <= cap) return p;
    changed = true;
    let seats = taken.get(p.tableId);
    if (!seats) {
      seats = new Set();
      taken.set(p.tableId, seats);
    }
    for (let seatN = 1; seatN <= cap; seatN++) {
      if (!seats.has(seatN)) {
        seats.add(seatN);
        return { ...p, seat: seatN };
      }
    }
    return { ...p, tableId: null, seat: null };
  });
  return changed ? next : players;
}

/**
 * Tables, payouts, blind levels, and entry pricing are edited as a draft on
 * the settings page and committed in one step via `saveSettings`, so the
 * store only exposes the actions the live dashboard needs.
 */
type TournamentStore = TournamentState & {
  // players
  addPlayer: (name: string) => void;
  addPlayersBulk: (names: string[]) => void;
  removePlayer: (id: string) => void;
  renamePlayer: (id: string, name: string) => void;
  eliminatePlayer: (id: string) => void;
  restorePlayer: (id: string) => void;
  rebuyPlayer: (id: string) => void;
  undoRebuy: (id: string) => void;
  addOnPlayer: (id: string) => void;
  undoAddOn: (id: string) => void;

  // seating
  assignSeats: () => void;
  balanceNow: () => void;
  clearSeats: () => void;
  movePlayer: (
    id: string,
    dest: { tableId: string | null; seat: number | null },
  ) => void;
  acknowledgeRebalance: () => void;

  // clock
  toggleClock: () => void;
  resetLevel: () => void;
  nextLevel: () => void;
  prevLevel: () => void;
  tick: () => void;

  // lifecycle
  finishTournament: (opts: {
    type: FinishType;
    chopPlayerIds?: string[];
    chopShares?: Record<string, number>;
    chopAmounts?: Record<string, number>;
  }) => void;
  unfinishTournament: () => void;

  // bulk
  resetTournament: () => void;
  saveSettings: (draft: {
    name: string;
    startingStack: number;
    buyIn: number;
    rebuyChips: number;
    rebuyCost: number;
    addOnChips: number;
    addOnCost: number;
    settings: TournamentSettings;
    tables: Table[];
    payouts: PayoutSpot[];
    blindStructure: BlindLevel[];
    chipDenoms: ChipDenom[];
  }) => void;
};

const initialLevel = DEFAULT_BLIND_STRUCTURE[0];

const initialState: TournamentState = {
  name: DEFAULT_TOURNAMENT_NAME,
  startingStack: DEFAULT_STARTING_STACK,
  buyIn: DEFAULT_BUY_IN,
  rebuyChips: DEFAULT_REBUY_CHIPS,
  rebuyCost: DEFAULT_REBUY_COST,
  addOnChips: DEFAULT_ADD_ON_CHIPS,
  addOnCost: DEFAULT_ADD_ON_COST,
  tables: DEFAULT_TABLES,
  players: [],
  blindStructure: DEFAULT_BLIND_STRUCTURE,
  payouts: DEFAULT_PAYOUTS,
  chipDenoms: DEFAULT_CHIP_DENOMS,
  clock: {
    currentLevel: 0,
    remainingSec: initialLevel.durationSec,
    running: false,
    lastTickAt: 0,
    levelStartedAt: null,
  },
  settings: DEFAULT_SETTINGS,
};

/**
 * Wall-clock reconciliation used on tab restore. Walks the blind structure
 * forward from `clock.currentLevel`, rolling through any levels that elapsed
 * while the tab was backgrounded / closed. Clamps against negative clock
 * drift and caps at the last level so it never overshoots a shortened
 * structure.
 */
function reconcileClock(
  clock: TournamentState["clock"],
  blindStructure: BlindLevel[],
): TournamentState["clock"] {
  if (!clock.running || clock.levelStartedAt == null) return clock;
  if (blindStructure.length === 0) return clock;

  const maxIdx = blindStructure.length - 1;
  let currentLevel = Math.min(clock.currentLevel, maxIdx);
  let levelStartedAt = clock.levelStartedAt;
  const now = Date.now();

  if (levelStartedAt > now) levelStartedAt = now;

  let guard = blindStructure.length + 1;
  while (guard-- > 0) {
    const lv = blindStructure[currentLevel];
    if (!lv) break;
    const elapsed = Math.floor((now - levelStartedAt) / 1000);
    const remaining = lv.durationSec - elapsed;
    if (remaining > 0) {
      return {
        ...clock,
        currentLevel,
        remainingSec: remaining,
        lastTickAt: now,
        levelStartedAt,
      };
    }
    if (currentLevel >= maxIdx) {
      return {
        ...clock,
        currentLevel: maxIdx,
        remainingSec: 0,
        running: false,
        lastTickAt: now,
        levelStartedAt,
      };
    }
    levelStartedAt = levelStartedAt + lv.durationSec * 1000;
    currentLevel += 1;
  }
  return clock;
}

export const useTournament = create<TournamentStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addPlayer: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const s = get();
        const now = Date.now();
        const seatedNow = s.startedAt != null && s.finishedAt == null;
        const p: Player = {
          id: uid("p"),
          name: trimmed,
          tableId: null,
          seat: null,
          chips: s.startingStack,
          rebuys: 0,
          addOns: 0,
          eliminated: false,
          playIntervals: seatedNow ? [{ startedAt: now }] : [],
        };
        set({ players: [...s.players, p] });
      },
      addPlayersBulk: (names) => {
        const s = get();
        const starting = s.startingStack;
        const now = Date.now();
        const seatedNow = s.startedAt != null && s.finishedAt == null;
        const cleaned = names
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
        const newPlayers: Player[] = cleaned.map((name) => ({
          id: uid("p"),
          name,
          tableId: null,
          seat: null,
          chips: starting,
          rebuys: 0,
          addOns: 0,
          eliminated: false,
          playIntervals: seatedNow ? [{ startedAt: now }] : [],
        }));
        set({ players: [...s.players, ...newPlayers] });
      },
      removePlayer: (id) =>
        set((s) => {
          const target = s.players.find((p) => p.id === id);
          if (!target) return {};
          const players = s.players.filter((p) => p.id !== id);
          // Before the tournament starts, removal means "added by mistake"
          // and no money is in the pot yet. After start, the player's
          // buy-in/rebuys/add-ons have been paid — keep them counted so the
          // prize pool doesn't silently shrink (computeStats folds
          // `removedEntries` back into the pool).
          if (s.startedAt == null) return { players };
          const prev = s.removedEntries ?? { buyIns: 0, rebuys: 0, addOns: 0 };
          return {
            players,
            removedEntries: {
              buyIns: prev.buyIns + 1,
              rebuys: prev.rebuys + (target.rebuys ?? 0),
              addOns: prev.addOns + (target.addOns ?? 0),
            },
          };
        }),
      renamePlayer: (id, name) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
        })),
      eliminatePlayer: (id) => {
        const s = get();
        const target = s.players.find((p) => p.id === id);
        if (!target || target.eliminated) return;
        const remainingActive = s.players.filter(
          (p) => !p.eliminated && p.id !== id,
        ).length;
        const place = remainingActive + 1;
        const now = Date.now();
        let updated = s.players.map((p) =>
          p.id === id
            ? {
                ...p,
                eliminated: true,
                tableId: null,
                seat: null,
                chipsBeforeElim: p.chips,
                chips: 0,
                eliminatedAt: now,
                finishPlace: place,
                playIntervals: stopPlay(p.playIntervals, now),
              }
            : p,
        );
        // If no active players remain, the tournament is over. The eliminated
        // player already holds finishPlace 1 (remainingActive + 1 === 1).
        const autoFinishElim = remainingActive === 0 && !s.finishedAt;
        // If exactly one player remains, they win automatically.
        const autoFinishWinner = remainingActive === 1 && !s.finishedAt;
        if (autoFinishWinner) {
          updated = updated.map((p) =>
            !p.eliminated && p.finishPlace == null
              ? { ...p, finishPlace: 1 }
              : p,
          );
        }
        let nextPlayers = updated;
        let nextTables = s.tables;
        let rebalanceMoves: RebalanceMove[] = [];
        if (s.settings.autoBalance) {
          const res = balanceTables(updated, s.tables);
          nextPlayers = res.players;
          nextTables = res.tables;
          rebalanceMoves = diffSeating(updated, res.players, s.tables, res.tables);
        }
        const autoFinish = autoFinishWinner || autoFinishElim;
        if (autoFinish) {
          nextPlayers = stopAllPlay(nextPlayers, now);
        }
        set({
          players: nextPlayers,
          tables: nextTables,
          // When a rebalance was computed, an empty diff must also *clear*
          // any unacknowledged popup from a previous run — its moves are
          // stale against the new seating.
          ...(s.settings.autoBalance
            ? {
                pendingRebalanceMoves:
                  rebalanceMoves.length > 0 ? rebalanceMoves : undefined,
              }
            : {}),
          ...(autoFinish
            ? {
                finishedAt: now,
                finishType: (autoFinishWinner
                  ? "winner"
                  : "elimination") as FinishType,
                clock: { ...s.clock, running: false },
              }
            : {}),
        });
      },
      restorePlayer: (id) =>
        set((s) => {
          const now = Date.now();
          const resume = s.startedAt != null && s.finishedAt == null;
          return {
            players: s.players.map((p) =>
              p.id === id
                ? {
                    ...p,
                    eliminated: false,
                    eliminatedAt: undefined,
                    finishPlace: undefined,
                    chips: p.chipsBeforeElim ?? s.startingStack,
                    chipsBeforeElim: undefined,
                    playIntervals: resume
                      ? startPlay(p.playIntervals, now)
                      : p.playIntervals,
                  }
                : p,
            ),
          };
        }),
      rebuyPlayer: (id) =>
        set((s) => {
          const target = s.players.find((p) => p.id === id);
          // Refuse to rebuy eliminated players — the UI should already hide
          // this, but the store enforces the invariant for safety.
          if (!target || target.eliminated) return {};
          return {
            players: s.players.map((p) =>
              p.id === id
                ? {
                    ...p,
                    chips: p.chips + s.rebuyChips,
                    rebuys: p.rebuys + 1,
                  }
                : p,
            ),
          };
        }),
      addOnPlayer: (id) =>
        set((s) => {
          const target = s.players.find((p) => p.id === id);
          // Mirror rebuyPlayer: eliminated players can't take add-ons. The
          // UI disables the controls, but the store enforces the invariant.
          if (!target || target.eliminated) return {};
          return {
            players: s.players.map((p) =>
              p.id === id
                ? {
                    ...p,
                    chips: p.chips + s.addOnChips,
                    addOns: (p.addOns ?? 0) + 1,
                  }
                : p,
            ),
          };
        }),
      undoRebuy: (id) =>
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== id) return p;
            // An eliminated player's paid rebuys are part of the prize pool;
            // restore the player first if a correction is really needed.
            if (p.eliminated) return p;
            const current = p.rebuys ?? 0;
            if (current <= 0) return p;
            return {
              ...p,
              rebuys: current - 1,
              chips: Math.max(0, p.chips - s.rebuyChips),
            };
          }),
        })),
      undoAddOn: (id) =>
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== id) return p;
            // Same invariant as undoRebuy: no pool edits via busted players.
            if (p.eliminated) return p;
            const current = p.addOns ?? 0;
            if (current <= 0) return p;
            return {
              ...p,
              addOns: current - 1,
              chips: Math.max(0, p.chips - s.addOnChips),
            };
          }),
        })),
      assignSeats: () => {
        const s = get();
        const cleared = s.players.map((p) =>
          p.eliminated ? p : { ...p, tableId: null, seat: null },
        );
        const restored = s.tables.map((t) => ({ ...t, broken: false }));
        const assigned = randomAssign(
          cleared,
          restored,
          s.settings.seatingMode,
        );
        set({ players: assigned, tables: restored });
      },
      balanceNow: () => {
        const s = get();
        const res = balanceTables(s.players, s.tables);
        const moves = diffSeating(s.players, res.players, s.tables, res.tables);
        set({
          players: res.players,
          tables: res.tables,
          // An empty diff clears any stale unacknowledged popup (see
          // eliminatePlayer).
          pendingRebalanceMoves: moves.length > 0 ? moves : undefined,
        });
      },
      acknowledgeRebalance: () => set({ pendingRebalanceMoves: undefined }),
      clearSeats: () =>
        set((s) => ({
          players: s.players.map((p) => ({
            ...p,
            tableId: null,
            seat: null,
          })),
          tables: s.tables.map((t) => ({ ...t, broken: false })),
        })),
      movePlayer: (id, dest) => {
        const s = get();
        const mover = s.players.find((p) => p.id === id);
        if (!mover || mover.eliminated) return;

        if (dest.tableId == null) {
          if (mover.tableId == null && mover.seat == null) return;
          set({
            players: s.players.map((p) =>
              p.id === id ? { ...p, tableId: null, seat: null } : p,
            ),
          });
          return;
        }

        const table = s.tables.find((t) => t.id === dest.tableId);
        if (!table || table.broken) return;
        if (
          dest.seat == null ||
          !Number.isInteger(dest.seat) ||
          dest.seat < 1 ||
          dest.seat > table.seatCount
        ) {
          return;
        }

        if (mover.tableId === dest.tableId && mover.seat === dest.seat) return;

        const occupant = s.players.find(
          (p) =>
            p.id !== id &&
            !p.eliminated &&
            p.tableId === dest.tableId &&
            p.seat === dest.seat,
        );

        set({
          players: s.players.map((p) => {
            if (p.id === id) {
              return { ...p, tableId: dest.tableId, seat: dest.seat };
            }
            if (occupant && p.id === occupant.id) {
              return { ...p, tableId: null, seat: null };
            }
            return p;
          }),
        });
      },

      toggleClock: () =>
        set((s) => {
          const willRun = !s.clock.running;
          const now = Date.now();
          const lv = s.blindStructure[s.clock.currentLevel];
          const dur = lv?.durationSec ?? s.clock.remainingSec;
          const firstStart = willRun && s.startedAt == null;
          return {
            clock: {
              ...s.clock,
              running: willRun,
              lastTickAt: now,
              levelStartedAt: willRun
                ? now - (dur - s.clock.remainingSec) * 1000
                : s.clock.levelStartedAt,
            },
            ...(firstStart ? { startedAt: now } : {}),
            ...(firstStart
              ? { players: startActivePlay(s.players, now) }
              : {}),
          };
        }),
      resetLevel: () =>
        set((s) => {
          const lv = s.blindStructure[s.clock.currentLevel];
          const dur = lv?.durationSec ?? s.clock.remainingSec;
          return {
            clock: {
              ...s.clock,
              remainingSec: dur,
              levelStartedAt: s.clock.running ? Date.now() : null,
            },
          };
        }),
      nextLevel: () =>
        set((s) => {
          const next = Math.min(
            s.clock.currentLevel + 1,
            s.blindStructure.length - 1,
          );
          const lv = s.blindStructure[next];
          const dur = lv?.durationSec ?? 0;
          return {
            clock: {
              ...s.clock,
              currentLevel: next,
              remainingSec: dur,
              levelStartedAt: s.clock.running ? Date.now() : null,
            },
          };
        }),
      prevLevel: () =>
        set((s) => {
          const prev = Math.max(0, s.clock.currentLevel - 1);
          const lv = s.blindStructure[prev];
          const dur = lv?.durationSec ?? 0;
          return {
            clock: {
              ...s.clock,
              currentLevel: prev,
              remainingSec: dur,
              levelStartedAt: s.clock.running ? Date.now() : null,
            },
          };
        }),
      tick: () => {
        const s = get();
        if (!s.clock.running) return;
        const cur = s.blindStructure[s.clock.currentLevel];
        if (!cur) return;

        const now = Date.now();
        let levelStartedAt = s.clock.levelStartedAt;
        // If levelStartedAt is missing (e.g. persisted state from before this
        // field existed), derive it from current remaining time.
        if (levelStartedAt == null) {
          levelStartedAt = now - (cur.durationSec - s.clock.remainingSec) * 1000;
        }
        // Clamp against negative drift (system clock moved backward).
        if (levelStartedAt > now) levelStartedAt = now;

        const elapsedSec = Math.floor((now - levelStartedAt) / 1000);
        const prevRemaining = s.clock.remainingSec;
        const remaining = Math.max(0, cur.durationSec - elapsedSec);

        // Fire warning sound when crossing the warn threshold within this tick.
        if (
          s.settings.soundEnabled &&
          remaining > 0 &&
          remaining <= s.settings.warnSec &&
          prevRemaining > s.settings.warnSec
        ) {
          playWarning();
        }

        if (remaining <= 0) {
          if (s.settings.soundEnabled) playLevelUp();
          // Reuse the rehydration walk so a single tick can roll through
          // *every* level that expired while the tab was backgrounded
          // (throttled intervals can skip many seconds), instead of
          // advancing one level per tick and sitting on 0:00. The walk
          // carries elapsed time forward level by level and stops the clock
          // at the end of the structure.
          set({
            clock: reconcileClock(
              { ...s.clock, levelStartedAt, lastTickAt: now },
              s.blindStructure,
            ),
          });
          return;
        }

        set({
          clock: {
            ...s.clock,
            remainingSec: remaining,
            lastTickAt: now,
            levelStartedAt,
          },
        });
      },

      finishTournament: ({ type, chopPlayerIds, chopShares, chopAmounts }) => {
        const s = get();
        const now = Date.now();
        let players = s.players;
        let shares: Record<string, number> | undefined;
        let amounts: Record<string, number> | undefined;
        if (type === "chop") {
          const ids =
            chopPlayerIds ??
            s.players.filter((p) => !p.eliminated).map((p) => p.id);
          if (ids.length > 0) {
            if (chopAmounts && Object.keys(chopAmounts).length > 0) {
              amounts = Object.fromEntries(
                Object.entries(chopAmounts).map(([id, amt]) => [
                  id,
                  Math.max(0, Number(amt) || 0),
                ]),
              );
            } else if (chopShares && Object.keys(chopShares).length > 0) {
              shares = { ...chopShares };
            } else {
              // Equal split of total payout % across remaining players.
              const totalPct = s.payouts.reduce((sum, p) => sum + p.percent, 0);
              const each = totalPct / ids.length;
              shares = Object.fromEntries(ids.map((id) => [id, each]));
            }
            const chopSet = new Set(ids);
            // Remaining active players NOT in the chop group, ranked by chips
            // descending (id asc as a stable tiebreak) and placed immediately
            // behind the chop tie at place `ids.length + 1`, +2, etc.
            const nonChopActives = s.players
              .filter(
                (p) => !p.eliminated && !chopSet.has(p.id) && p.finishPlace == null,
              )
              .slice()
              .sort((a, b) => {
                if (b.chips !== a.chips) return b.chips - a.chips;
                return a.id.localeCompare(b.id);
              });
            const nonChopPlaces = new Map<string, number>();
            nonChopActives.forEach((p, i) => {
              nonChopPlaces.set(p.id, ids.length + 1 + i);
            });
            players = s.players.map((p) => {
              if (chopSet.has(p.id)) {
                // Chop members all tie at place 1.
                return { ...p, finishPlace: 1 };
              }
              const np = nonChopPlaces.get(p.id);
              if (np != null) {
                // Anyone outside the chop busts at their ranked place —
                // same rule as the winner finish below.
                return {
                  ...p,
                  finishPlace: np,
                  eliminated: true,
                  eliminatedAt: now,
                };
              }
              return p;
            });
          }
        } else {
          // "winner": resolve remaining active players into unique places.
          const actives = s.players.filter(
            (p) => !p.eliminated && p.finishPlace == null,
          );
          if (actives.length === 1) {
            const winnerId = actives[0].id;
            players = s.players.map((p) =>
              p.id === winnerId ? { ...p, finishPlace: 1 } : p,
            );
          } else if (actives.length > 1) {
            const ranked = actives.slice().sort((a, b) => {
              if (b.chips !== a.chips) return b.chips - a.chips;
              return a.id.localeCompare(b.id);
            });
            const placeById = new Map<string, number>();
            ranked.forEach((p, i) => placeById.set(p.id, i + 1));
            // Only the winner stays active; everyone else busts at their
            // ranked place so the tournament can't end with multiple
            // "active" players holding finish ranks.
            players = s.players.map((p) => {
              const place = placeById.get(p.id);
              if (place == null) return p;
              return place === 1
                ? { ...p, finishPlace: 1 }
                : { ...p, finishPlace: place, eliminated: true, eliminatedAt: now };
            });
          }
        }
        set({
          players: stopAllPlay(players, now),
          finishedAt: now,
          finishType: type,
          chopShares: shares,
          chopAmounts: amounts,
          clock: { ...s.clock, running: false },
        });
      },

      unfinishTournament: () =>
        set((s) => {
          const now = Date.now();
          return {
            finishedAt: undefined,
            finishType: undefined,
            chopShares: undefined,
            chopAmounts: undefined,
            // Eliminated players keep their earned places, but actives must
            // not carry finish metadata back into a live game (a reopened
            // winner with finishPlace 1 corrupts payouts/recap if the game is
            // finished again later).
            players: s.players.map((p) => {
              const cleared =
                !p.eliminated &&
                (p.finishPlace != null || p.eliminatedAt != null)
                  ? { ...p, finishPlace: undefined, eliminatedAt: undefined }
                  : p;
              if (cleared.eliminated) return cleared;
              return {
                ...cleared,
                playIntervals: startPlay(cleared.playIntervals, now),
              };
            }),
            clock: { ...s.clock },
          };
        }),

      resetTournament: () =>
        set({
          ...initialState,
          blindStructure: DEFAULT_BLIND_STRUCTURE,
          payouts: DEFAULT_PAYOUTS,
          chipDenoms: DEFAULT_CHIP_DENOMS,
          tables: DEFAULT_TABLES,
          settings: DEFAULT_SETTINGS,
          clock: {
            currentLevel: 0,
            remainingSec: DEFAULT_BLIND_STRUCTURE[0].durationSec,
            running: false,
            lastTickAt: 0,
            levelStartedAt: null,
          },
          startedAt: undefined,
          finishedAt: undefined,
          finishType: undefined,
          chopShares: undefined,
          chopAmounts: undefined,
          pendingRebalanceMoves: undefined,
          removedEntries: undefined,
        }),

      saveSettings: (draft) => {
        const s = get();
        // Normalize payouts: sort by place, renumber sequentially.
        const payouts = draft.payouts
          .slice()
          .sort((a, b) => a.place - b.place)
          .map((p, i) => ({ ...p, place: i + 1 }));
        // Normalize blind structure: renumber sequentially.
        const blindStructure = ensureBlindLevelIds(
          draft.blindStructure.map((lv, i) => ({
            ...lv,
            level: i + 1,
          })),
        );
        // Drop tables that were removed from the draft and clear seating for
        // players that were seated at those removed tables. Then clamp any
        // player whose seat exceeds a reduced seat count.
        const keptTableIds = new Set(draft.tables.map((t) => t.id));
        const players = clampSeatsToTables(
          s.players.map((p) =>
            p.tableId && !keptTableIds.has(p.tableId)
              ? { ...p, tableId: null, seat: null }
              : p,
          ),
          draft.tables,
        );

        // Adjust clock to match new structure.
        const newLen = blindStructure.length;
        let currentLevel = Math.min(
          s.clock.currentLevel,
          Math.max(0, newLen - 1),
        );
        if (newLen === 0) currentLevel = 0;
        const currentLv = blindStructure[currentLevel];
        // If the current level's duration changed and remaining exceeds it,
        // clamp. Otherwise preserve the in-progress countdown.
        let remainingSec = s.clock.remainingSec;
        if (!currentLv) {
          remainingSec = 0;
        } else if (remainingSec > currentLv.durationSec) {
          remainingSec = currentLv.durationSec;
        }

        set({
          name: draft.name,
          startingStack: Math.max(0, draft.startingStack),
          buyIn: Math.max(0, draft.buyIn),
          rebuyChips: Math.max(0, draft.rebuyChips),
          rebuyCost: Math.max(0, draft.rebuyCost),
          addOnChips: Math.max(0, draft.addOnChips),
          addOnCost: Math.max(0, draft.addOnCost),
          settings: draft.settings,
          tables: draft.tables,
          payouts,
          blindStructure,
          chipDenoms: draft.chipDenoms.map((c) => ({
            ...c,
            value: Math.max(0, c.value),
          })),
          players,
          clock: {
            ...s.clock,
            currentLevel,
            remainingSec,
          },
        });
      },
    }),
    {
      name: "poker-tournament-v1",
      storage: createJSONStorage(() => localStorage),
      version: 8,
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState as TournamentState;
        let state = persistedState as Partial<TournamentState>;
        if (version < 2) {
          state = {
            ...state,
            addOnChips: state.addOnChips ?? DEFAULT_ADD_ON_CHIPS,
            addOnCost: state.addOnCost ?? DEFAULT_ADD_ON_COST,
            players: (state.players ?? []).map((p) => ({
              ...p,
              addOns: p.addOns ?? 0,
              rebuys: p.rebuys ?? 0,
            })),
          };
        }
        if (version < 3) {
          // v3 introduces `clock.levelStartedAt` for wall-clock reconciliation.
          // Fall back to `lastTickAt` (if the clock was running) so we don't
          // drop the user's progress; otherwise leave null.
          const existingClock = state.clock;
          if (existingClock) {
            state = {
              ...state,
              clock: {
                ...existingClock,
                levelStartedAt:
                  existingClock.running && existingClock.lastTickAt
                    ? existingClock.lastTickAt -
                      ((state.blindStructure?.[existingClock.currentLevel]
                        ?.durationSec ?? existingClock.remainingSec) -
                        existingClock.remainingSec) *
                        1000
                    : null,
              },
            };
          }
        }
        if (version < 4) {
          state = {
            ...state,
            chipDenoms:
              Array.isArray(state.chipDenoms) && state.chipDenoms.length > 0
                ? state.chipDenoms
                : DEFAULT_CHIP_DENOMS,
          };
        }
        if (version < 5) {
          // v5 swaps the default colors for 1000 (black → blue) and
          // 25000 (blue → black). Only touch chipDenoms that still match the
          // old v4 defaults so we don't clobber user customizations.
          const OLD_V4_DEFAULTS: ChipDenom[] = [
            { id: "c1", value: 100, color: "white" },
            { id: "c2", value: 500, color: "green" },
            { id: "c3", value: 1000, color: "black" },
            { id: "c4", value: 5000, color: "red" },
            { id: "c5", value: 25000, color: "blue" },
          ];
          const cur = state.chipDenoms ?? [];
          const matchesOld =
            cur.length === OLD_V4_DEFAULTS.length &&
            cur.every((c, i) => {
              const o = OLD_V4_DEFAULTS[i];
              return c.value === o.value && c.color === o.color;
            });
          if (matchesOld) {
            state = { ...state, chipDenoms: DEFAULT_CHIP_DENOMS };
          }
        }
        if (version < 6) {
          // v6 introduces a separate `rebuyCost` (dollars) so rebuys aren't
          // implicitly priced at `buyIn`. Default to the existing buy-in so
          // prize-pool math and player totals don't change for users
          // upgrading from v5 or earlier.
          state = {
            ...state,
            rebuyCost:
              state.rebuyCost ?? state.buyIn ?? DEFAULT_REBUY_COST,
          };
        }
        if (version < 7) {
          // v7 adds stable `id` on each blind level so the structure editor
          // can key rows without losing input state on reorder.
          state = {
            ...state,
            blindStructure: ensureBlindLevelIds(state.blindStructure ?? []),
          };
        }
        if (version < 8) {
          // v8 records seated stints so each player gets a live time-played
          // clock. Derive the first stint from start / elimination / finish.
          state = {
            ...state,
            players: (state.players ?? []).map((p) => ({
              ...p,
              playIntervals: migrateTournamentIntervals(
                p,
                state.startedAt,
                state.finishedAt,
              ),
            })),
          };
        }
        return state as TournamentState;
      },
      onRehydrateStorage: () => (rehydrated, error) => {
        if (error || !rehydrated) return;
        // Catch up elapsed time while the tab was closed, rolling through any
        // levels that expired. Scheduled as a microtask so zustand has finished
        // committing the rehydrated state before we patch it. Safe because
        // reconcileClock clamps against out-of-range indices and backward
        // clock drift.
        const clock = reconcileClock(
          rehydrated.clock,
          rehydrated.blindStructure,
        );
        if (clock !== rehydrated.clock) {
          queueMicrotask(() => useTournament.setState({ clock }));
        }
      },
      // Persist only data fields. Filtering by type (instead of a manual
      // destructure list) can't drift when actions are added or renamed —
      // the old list had already missed `acknowledgeRebalance`.
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([, v]) => typeof v !== "function"),
        ) as TournamentState,
    },
  ),
);

