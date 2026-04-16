"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CashGameState, CashPlayer } from "./cashTypes";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

const DEFAULT_SMALL_BLIND = 0.1;
const DEFAULT_BIG_BLIND = 0.2;
const DEFAULT_BUY_IN = 20;
const DEFAULT_NAME = "Home Cash Game";

const initialState: CashGameState = {
  name: DEFAULT_NAME,
  smallBlind: DEFAULT_SMALL_BLIND,
  bigBlind: DEFAULT_BIG_BLIND,
  defaultBuyIn: DEFAULT_BUY_IN,
  players: [],
};

type CashStore = CashGameState & {
  saveSettings: (draft: {
    name: string;
    smallBlind: number;
    bigBlind: number;
    defaultBuyIn: number;
  }) => void;

  addPlayer: (name: string, initialBuyIn: number) => void;
  renamePlayer: (id: string, name: string) => void;
  removePlayer: (id: string) => void;

  rebuy: (id: string, amount: number) => void;
  editBuyIn: (playerId: string, buyInId: string, amount: number) => void;
  removeBuyIn: (playerId: string, buyInId: string) => void;

  cashOutPlayer: (id: string, amount: number) => void;
  reopenPlayer: (id: string) => void;

  endGame: () => boolean; // returns true on success
  reopenGame: () => void;
  resetGame: () => void;
};

export const useCash = create<CashStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      saveSettings: (draft) =>
        set({
          name: draft.name,
          smallBlind: Math.max(0, draft.smallBlind),
          bigBlind: Math.max(0, draft.bigBlind),
          defaultBuyIn: Math.max(0, draft.defaultBuyIn),
        }),

      addPlayer: (name, initialBuyIn) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const s = get();
        const amount = Math.max(0, initialBuyIn);
        const player: CashPlayer = {
          id: uid("cp"),
          name: trimmed,
          buyIns: [{ id: uid("bi"), amount, at: Date.now() }],
        };
        set({
          players: [...s.players, player],
          startedAt: s.startedAt ?? Date.now(),
        });
      },

      renamePlayer: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, name: trimmed } : p,
          ),
        }));
      },

      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
        })),

      rebuy: (id, amount) => {
        const amt = Math.max(0, amount);
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id
              ? {
                  ...p,
                  buyIns: [
                    ...p.buyIns,
                    { id: uid("bi"), amount: amt, at: Date.now() },
                  ],
                }
              : p,
          ),
        }));
      },

      editBuyIn: (playerId, buyInId, amount) => {
        const amt = Math.max(0, amount);
        set((s) => ({
          players: s.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  buyIns: p.buyIns.map((b) =>
                    b.id === buyInId ? { ...b, amount: amt } : b,
                  ),
                }
              : p,
          ),
        }));
      },

      removeBuyIn: (playerId, buyInId) => {
        set((s) => ({
          players: s.players.map((p) =>
            p.id === playerId
              ? { ...p, buyIns: p.buyIns.filter((b) => b.id !== buyInId) }
              : p,
          ),
        }));
      },

      cashOutPlayer: (id, amount) => {
        const amt = Math.max(0, amount);
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, cashOut: { amount: amt, at: Date.now() } } : p,
          ),
        }));
      },

      reopenPlayer: (id) =>
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id ? { ...p, cashOut: undefined } : p,
          ),
        })),

      endGame: () => {
        const s = get();
        const anyUnsettled = s.players.some((p) => !p.cashOut);
        if (anyUnsettled) return false;
        set({ endedAt: Date.now() });
        return true;
      },

      reopenGame: () => set({ endedAt: undefined }),

      resetGame: () =>
        set({
          ...initialState,
          startedAt: undefined,
          endedAt: undefined,
        }),
    }),
    {
      name: "poker-cash-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => {
        const {
          saveSettings: _1,
          addPlayer: _2,
          renamePlayer: _3,
          removePlayer: _4,
          rebuy: _5,
          editBuyIn: _6,
          removeBuyIn: _7,
          cashOutPlayer: _8,
          reopenPlayer: _9,
          endGame: _10,
          reopenGame: _11,
          resetGame: _12,
          ...rest
        } = state;
        void _1;void _2;void _3;void _4;void _5;void _6;
        void _7;void _8;void _9;void _10;void _11;void _12;
        return rest;
      },
    },
  ),
);

export function totalBuyIns(player: CashPlayer): number {
  return player.buyIns.reduce((sum, b) => sum + b.amount, 0);
}

export function playerNet(player: CashPlayer): number | null {
  if (!player.cashOut) return null;
  return player.cashOut.amount - totalBuyIns(player);
}
