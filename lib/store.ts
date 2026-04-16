"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  BlindLevel,
  PayoutSpot,
  Player,
  Table,
  TournamentSettings,
  TournamentState,
} from "./types";
import {
  DEFAULT_ADD_ON_CHIPS,
  DEFAULT_ADD_ON_COST,
  DEFAULT_BLIND_STRUCTURE,
  DEFAULT_BUY_IN,
  DEFAULT_PAYOUTS,
  DEFAULT_REBUY_CHIPS,
  DEFAULT_SETTINGS,
  DEFAULT_STARTING_STACK,
  DEFAULT_TABLES,
  DEFAULT_TOURNAMENT_NAME,
} from "./defaults";
import { balanceTables, randomAssign } from "./seating";
import { playLevelUp, playWarning } from "./clock";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

type TournamentStore = TournamentState & {
  // tournament-level
  setName: (name: string) => void;
  setStartingStack: (n: number) => void;
  setBuyIn: (n: number) => void;
  setRebuyChips: (n: number) => void;
  setAddOnChips: (n: number) => void;
  setAddOnCost: (n: number) => void;
  updateSettings: (partial: Partial<TournamentSettings>) => void;

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
  adjustChips: (id: string, delta: number) => void;
  setChips: (id: string, chips: number) => void;

  // tables
  addTable: (name?: string, seatCount?: number) => void;
  removeTable: (id: string) => void;
  renameTable: (id: string, name: string) => void;
  setTableSeats: (id: string, seatCount: number) => void;

  // seating
  assignSeats: () => void;
  balanceNow: () => void;
  clearSeats: () => void;

  // blind structure
  addLevel: (level?: Partial<BlindLevel>) => void;
  updateLevel: (index: number, partial: Partial<BlindLevel>) => void;
  removeLevel: (index: number) => void;
  moveLevel: (index: number, dir: -1 | 1) => void;
  setBlindStructure: (levels: BlindLevel[]) => void;

  // payouts
  setPayouts: (spots: PayoutSpot[]) => void;
  updatePayout: (place: number, percent: number) => void;
  addPayoutSpot: () => void;
  removePayoutSpot: (place: number) => void;

  // clock
  startClock: () => void;
  pauseClock: () => void;
  toggleClock: () => void;
  resetLevel: () => void;
  nextLevel: () => void;
  prevLevel: () => void;
  tick: () => void;

  // bulk
  resetTournament: () => void;
  importState: (state: Partial<TournamentState>) => void;
  saveSettings: (draft: {
    name: string;
    startingStack: number;
    buyIn: number;
    rebuyChips: number;
    addOnChips: number;
    addOnCost: number;
    settings: TournamentSettings;
    tables: Table[];
    payouts: PayoutSpot[];
    blindStructure: BlindLevel[];
  }) => void;
};

const initialLevel = DEFAULT_BLIND_STRUCTURE[0];

const initialState: TournamentState = {
  name: DEFAULT_TOURNAMENT_NAME,
  startingStack: DEFAULT_STARTING_STACK,
  buyIn: DEFAULT_BUY_IN,
  rebuyChips: DEFAULT_REBUY_CHIPS,
  addOnChips: DEFAULT_ADD_ON_CHIPS,
  addOnCost: DEFAULT_ADD_ON_COST,
  tables: DEFAULT_TABLES,
  players: [],
  blindStructure: DEFAULT_BLIND_STRUCTURE,
  payouts: DEFAULT_PAYOUTS,
  clock: {
    currentLevel: 0,
    remainingSec: initialLevel.durationSec,
    running: false,
    lastTickAt: 0,
  },
  settings: DEFAULT_SETTINGS,
};

export const useTournament = create<TournamentStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setName: (name) => set({ name }),
      setStartingStack: (n) => set({ startingStack: Math.max(0, n) }),
      setBuyIn: (n) => set({ buyIn: Math.max(0, n) }),
      setRebuyChips: (n) => set({ rebuyChips: Math.max(0, n) }),
      setAddOnChips: (n) => set({ addOnChips: Math.max(0, n) }),
      setAddOnCost: (n) => set({ addOnCost: Math.max(0, n) }),
      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      addPlayer: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const p: Player = {
          id: uid("p"),
          name: trimmed,
          tableId: null,
          seat: null,
          chips: get().startingStack,
          rebuys: 0,
          addOns: 0,
          eliminated: false,
        };
        set((s) => ({ players: [...s.players, p] }));
      },
      addPlayersBulk: (names) => {
        const starting = get().startingStack;
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
        }));
        set((s) => ({ players: [...s.players, ...newPlayers] }));
      },
      removePlayer: (id) =>
        set((s) => ({ players: s.players.filter((p) => p.id !== id) })),
      renamePlayer: (id, name) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
        })),
      eliminatePlayer: (id) => {
        const s = get();
        const remainingActive = s.players.filter(
          (p) => !p.eliminated && p.id !== id,
        ).length;
        const place = remainingActive + 1;
        const updated = s.players.map((p) =>
          p.id === id
            ? {
                ...p,
                eliminated: true,
                tableId: null,
                seat: null,
                chips: 0,
                eliminatedAt: Date.now(),
                finishPlace: place,
              }
            : p,
        );
        let nextPlayers = updated;
        let nextTables = s.tables;
        if (s.settings.autoBalance) {
          const res = balanceTables(updated, s.tables);
          nextPlayers = res.players;
          nextTables = res.tables;
        }
        set({ players: nextPlayers, tables: nextTables });
      },
      restorePlayer: (id) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id
              ? {
                  ...p,
                  eliminated: false,
                  eliminatedAt: undefined,
                  finishPlace: undefined,
                  chips: s.startingStack,
                }
              : p,
          ),
        })),
      rebuyPlayer: (id) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id
              ? {
                  ...p,
                  chips: p.chips + s.rebuyChips,
                  rebuys: p.rebuys + 1,
                  eliminated: false,
                  eliminatedAt: undefined,
                  finishPlace: undefined,
                }
              : p,
          ),
        })),
      addOnPlayer: (id) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id
              ? {
                  ...p,
                  chips: p.chips + s.addOnChips,
                  addOns: (p.addOns ?? 0) + 1,
                }
              : p,
          ),
        })),
      undoRebuy: (id) =>
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== id) return p;
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
            const current = p.addOns ?? 0;
            if (current <= 0) return p;
            return {
              ...p,
              addOns: current - 1,
              chips: Math.max(0, p.chips - s.addOnChips),
            };
          }),
        })),
      adjustChips: (id, delta) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id
              ? { ...p, chips: Math.max(0, p.chips + delta) }
              : p,
          ),
        })),
      setChips: (id, chips) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, chips: Math.max(0, chips) } : p,
          ),
        })),

      addTable: (name, seatCount) => {
        const s = get();
        const n = s.tables.length + 1;
        const newTable: Table = {
          id: uid("t"),
          name: name || `Table ${n}`,
          seatCount: seatCount ?? 9,
        };
        set({ tables: [...s.tables, newTable] });
      },
      removeTable: (id) =>
        set((s) => ({
          tables: s.tables.filter((t) => t.id !== id),
          players: s.players.map((p) =>
            p.tableId === id ? { ...p, tableId: null, seat: null } : p,
          ),
        })),
      renameTable: (id, name) =>
        set((s) => ({
          tables: s.tables.map((t) => (t.id === id ? { ...t, name } : t)),
        })),
      setTableSeats: (id, seatCount) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === id ? { ...t, seatCount: Math.max(2, seatCount) } : t,
          ),
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
        set({ players: res.players, tables: res.tables });
      },
      clearSeats: () =>
        set((s) => ({
          players: s.players.map((p) => ({
            ...p,
            tableId: null,
            seat: null,
          })),
          tables: s.tables.map((t) => ({ ...t, broken: false })),
        })),

      addLevel: (partial) => {
        const s = get();
        const last = s.blindStructure[s.blindStructure.length - 1];
        const nextLevel: BlindLevel = {
          level: (last?.level ?? 0) + 1,
          smallBlind: last ? last.smallBlind * 2 : 25,
          bigBlind: last ? last.bigBlind * 2 : 50,
          ante: last?.ante ?? 0,
          durationSec: last?.durationSec ?? 20 * 60,
          ...partial,
        };
        set({ blindStructure: [...s.blindStructure, nextLevel] });
      },
      updateLevel: (index, partial) =>
        set((s) => ({
          blindStructure: s.blindStructure.map((lv, i) =>
            i === index ? { ...lv, ...partial } : lv,
          ),
        })),
      removeLevel: (index) =>
        set((s) => {
          const next = s.blindStructure.filter((_, i) => i !== index);
          const renum = next.map((lv, i) => ({ ...lv, level: i + 1 }));
          const currentLevel = Math.min(
            s.clock.currentLevel,
            Math.max(0, renum.length - 1),
          );
          return {
            blindStructure: renum,
            clock: {
              ...s.clock,
              currentLevel,
              remainingSec:
                renum[currentLevel]?.durationSec ?? s.clock.remainingSec,
            },
          };
        }),
      moveLevel: (index, dir) =>
        set((s) => {
          const arr = s.blindStructure.slice();
          const j = index + dir;
          if (j < 0 || j >= arr.length) return {};
          [arr[index], arr[j]] = [arr[j], arr[index]];
          return {
            blindStructure: arr.map((lv, i) => ({ ...lv, level: i + 1 })),
          };
        }),
      setBlindStructure: (levels) =>
        set({
          blindStructure: levels.map((lv, i) => ({ ...lv, level: i + 1 })),
        }),

      setPayouts: (spots) =>
        set({
          payouts: spots
            .slice()
            .sort((a, b) => a.place - b.place)
            .map((p, i) => ({ ...p, place: i + 1 })),
        }),
      updatePayout: (place, percent) =>
        set((s) => ({
          payouts: s.payouts.map((p) =>
            p.place === place ? { ...p, percent } : p,
          ),
        })),
      addPayoutSpot: () =>
        set((s) => ({
          payouts: [
            ...s.payouts,
            { place: s.payouts.length + 1, percent: 0 },
          ],
        })),
      removePayoutSpot: (place) =>
        set((s) => ({
          payouts: s.payouts
            .filter((p) => p.place !== place)
            .map((p, i) => ({ ...p, place: i + 1 })),
        })),

      startClock: () =>
        set((s) => ({
          clock: { ...s.clock, running: true, lastTickAt: Date.now() },
        })),
      pauseClock: () =>
        set((s) => ({ clock: { ...s.clock, running: false } })),
      toggleClock: () =>
        set((s) => ({
          clock: {
            ...s.clock,
            running: !s.clock.running,
            lastTickAt: Date.now(),
          },
        })),
      resetLevel: () =>
        set((s) => {
          const lv = s.blindStructure[s.clock.currentLevel];
          return {
            clock: {
              ...s.clock,
              remainingSec: lv?.durationSec ?? s.clock.remainingSec,
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
          return {
            clock: {
              ...s.clock,
              currentLevel: next,
              remainingSec: lv?.durationSec ?? 0,
            },
          };
        }),
      prevLevel: () =>
        set((s) => {
          const prev = Math.max(0, s.clock.currentLevel - 1);
          const lv = s.blindStructure[prev];
          return {
            clock: {
              ...s.clock,
              currentLevel: prev,
              remainingSec: lv?.durationSec ?? 0,
            },
          };
        }),
      tick: () => {
        const s = get();
        if (!s.clock.running) return;
        const cur = s.blindStructure[s.clock.currentLevel];
        if (!cur) return;
        const next = s.clock.remainingSec - 1;

        if (
          s.settings.soundEnabled &&
          next === s.settings.warnSec &&
          next > 0
        ) {
          playWarning();
        }

        if (next <= 0) {
          const nextIdx = Math.min(
            s.clock.currentLevel + 1,
            s.blindStructure.length - 1,
          );
          const nextLv = s.blindStructure[nextIdx];
          const atEnd =
            s.clock.currentLevel >= s.blindStructure.length - 1;
          if (s.settings.soundEnabled) playLevelUp();
          set({
            clock: {
              ...s.clock,
              currentLevel: nextIdx,
              remainingSec: atEnd ? 0 : nextLv?.durationSec ?? 0,
              running: atEnd ? false : s.clock.running,
              lastTickAt: Date.now(),
            },
          });
          return;
        }

        set({
          clock: {
            ...s.clock,
            remainingSec: next,
            lastTickAt: Date.now(),
          },
        });
      },

      resetTournament: () =>
        set({
          ...initialState,
          blindStructure: DEFAULT_BLIND_STRUCTURE,
          payouts: DEFAULT_PAYOUTS,
          tables: DEFAULT_TABLES,
          settings: DEFAULT_SETTINGS,
          clock: {
            currentLevel: 0,
            remainingSec: DEFAULT_BLIND_STRUCTURE[0].durationSec,
            running: false,
            lastTickAt: 0,
          },
        }),

      importState: (state) => set((s) => ({ ...s, ...state })),

      saveSettings: (draft) => {
        const s = get();
        // Normalize payouts: sort by place, renumber sequentially.
        const payouts = draft.payouts
          .slice()
          .sort((a, b) => a.place - b.place)
          .map((p, i) => ({ ...p, place: i + 1 }));
        // Normalize blind structure: renumber sequentially.
        const blindStructure = draft.blindStructure.map((lv, i) => ({
          ...lv,
          level: i + 1,
        }));
        // Drop tables that were removed from the draft and clear seating for
        // players that were seated at those removed tables.
        const keptTableIds = new Set(draft.tables.map((t) => t.id));
        const players = s.players.map((p) =>
          p.tableId && !keptTableIds.has(p.tableId)
            ? { ...p, tableId: null, seat: null }
            : p,
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
          addOnChips: Math.max(0, draft.addOnChips),
          addOnCost: Math.max(0, draft.addOnCost),
          settings: draft.settings,
          tables: draft.tables,
          payouts,
          blindStructure,
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
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState as TournamentState;
        const state = persistedState as Partial<TournamentState>;
        if (version < 2) {
          return {
            ...state,
            addOnChips: state.addOnChips ?? DEFAULT_ADD_ON_CHIPS,
            addOnCost: state.addOnCost ?? DEFAULT_ADD_ON_COST,
            players: (state.players ?? []).map((p) => ({
              ...p,
              addOns: p.addOns ?? 0,
              rebuys: p.rebuys ?? 0,
            })),
          } as TournamentState;
        }
        return state as TournamentState;
      },
      partialize: (state) => {
        const {
          setName: _1,
          setStartingStack: _2,
          setBuyIn: _3,
          setRebuyChips: _4,
          updateSettings: _5,
          addPlayer: _6,
          addPlayersBulk: _7,
          removePlayer: _8,
          renamePlayer: _9,
          eliminatePlayer: _10,
          restorePlayer: _11,
          rebuyPlayer: _12,
          adjustChips: _13,
          setChips: _14,
          addTable: _15,
          removeTable: _16,
          renameTable: _17,
          setTableSeats: _18,
          assignSeats: _19,
          balanceNow: _20,
          clearSeats: _21,
          addLevel: _22,
          updateLevel: _23,
          removeLevel: _24,
          moveLevel: _25,
          setBlindStructure: _26,
          setPayouts: _27,
          updatePayout: _28,
          addPayoutSpot: _29,
          removePayoutSpot: _30,
          startClock: _31,
          pauseClock: _32,
          toggleClock: _33,
          resetLevel: _34,
          nextLevel: _35,
          prevLevel: _36,
          tick: _37,
          resetTournament: _38,
          importState: _39,
          saveSettings: _40,
          setAddOnChips: _41,
          setAddOnCost: _42,
          addOnPlayer: _43,
          undoRebuy: _44,
          undoAddOn: _45,
          ...rest
        } = state;
        void _1;void _2;void _3;void _4;void _5;void _6;void _7;void _8;void _9;void _10;
        void _11;void _12;void _13;void _14;void _15;void _16;void _17;void _18;void _19;void _20;
        void _21;void _22;void _23;void _24;void _25;void _26;void _27;void _28;void _29;void _30;
        void _31;void _32;void _33;void _34;void _35;void _36;void _37;void _38;void _39;void _40;
        void _41;void _42;void _43;void _44;void _45;
        return rest;
      },
    },
  ),
);

