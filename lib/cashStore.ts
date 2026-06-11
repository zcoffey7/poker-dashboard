"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CashGameState, CashPlayer } from "./cashTypes";
import { toCents } from "./money";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

// Defaults in integer cents.
const DEFAULT_SMALL_BLIND = 10;    // $0.10
const DEFAULT_BIG_BLIND = 20;      // $0.20
const DEFAULT_BUY_IN = 2000;       // $20.00
const DEFAULT_NAME = "Home Cash Game";

const initialState: CashGameState = {
  name: DEFAULT_NAME,
  smallBlind: DEFAULT_SMALL_BLIND,
  bigBlind: DEFAULT_BIG_BLIND,
  defaultBuyIn: DEFAULT_BUY_IN,
  players: [],
};

type CashStore = CashGameState & {
  /** All amount fields in the draft are in DOLLARS (float) and converted at the boundary. */
  saveSettings: (draft: {
    name: string;
    smallBlind: number;
    bigBlind: number;
    defaultBuyIn: number;
  }) => void;

  /** `initialBuyIn` in dollars. */
  addPlayer: (name: string, initialBuyIn: number) => void;
  renamePlayer: (id: string, name: string) => void;
  removePlayer: (id: string) => void;

  /** `amount` in dollars. */
  rebuy: (id: string, amount: number) => void;
  /** `amount` in dollars. */
  editBuyIn: (playerId: string, buyInId: string, amount: number) => void;
  removeBuyIn: (playerId: string, buyInId: string) => void;

  /** `amount` in dollars. */
  cashOutPlayer: (
    id: string,
    amount: number,
    opts?: { viaEndGame?: boolean },
  ) => void;
  reopenPlayer: (id: string) => void;

  endGame: () => boolean;
  reopenGame: () => void;
  resetGame: () => void;
};

/** Generate a unique, human-friendly variant of a name among the existing ones. */
function dedupeName(candidate: string, existing: readonly string[]): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(candidate.toLowerCase())) return candidate;
  for (let i = 2; i < 1000; i++) {
    const next = `${candidate} (${i})`;
    if (!taken.has(next.toLowerCase())) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[cash] Duplicate player name "${candidate}" — using "${next}"`,
        );
      }
      return next;
    }
  }
  return `${candidate} (${uid("dup")})`;
}

export const useCash = create<CashStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      saveSettings: (draft) => {
        const trimmed = draft.name.trim() || "Cash Game";
        const smallBlind = Math.max(0, toCents(draft.smallBlind));
        set({
          name: trimmed,
          smallBlind,
          // The form validates BB >= SB; clamp here too so no code path can
          // persist nonsensical blinds like $0.50/$0.25.
          bigBlind: Math.max(smallBlind, toCents(draft.bigBlind)),
          defaultBuyIn: Math.max(0, toCents(draft.defaultBuyIn)),
        });
      },

      addPlayer: (name, initialBuyIn) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const s = get();
        const unique = dedupeName(
          trimmed,
          s.players.map((p) => p.name),
        );
        const amountCents = Math.max(0, toCents(initialBuyIn));
        const player: CashPlayer = {
          id: uid("cp"),
          name: unique,
          buyIns: [{ id: uid("bi"), amount: amountCents, at: Date.now() }],
        };
        set({
          players: [...s.players, player],
          startedAt: s.startedAt ?? Date.now(),
        });
      },

      renamePlayer: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => {
          const target = s.players.find((p) => p.id === id);
          if (!target || target.name === trimmed) return {};
          // Same dedupe rule as addPlayer (excluding the player being
          // renamed) so two players can't end up sharing a name.
          const unique = dedupeName(
            trimmed,
            s.players.filter((p) => p.id !== id).map((p) => p.name),
          );
          return {
            players: s.players.map((p) =>
              p.id === id ? { ...p, name: unique } : p,
            ),
          };
        });
      },

      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
        })),

      rebuy: (id, amount) => {
        const amtCents = Math.max(0, toCents(amount));
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== id) return p;
            // Guard: cashed-out players are read-only until reopened.
            if (p.cashOut != null) return p;
            return {
              ...p,
              buyIns: [
                ...p.buyIns,
                { id: uid("bi"), amount: amtCents, at: Date.now() },
              ],
            };
          }),
        }));
      },

      editBuyIn: (playerId, buyInId, amount) => {
        const amtCents = Math.max(0, toCents(amount));
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== playerId) return p;
            if (p.cashOut != null) return p;
            // A player's only buy-in can't be edited to $0 — that's
            // effectively deleting it, which removeBuyIn also refuses.
            // Use Remove Player for "added by mistake".
            if (amtCents <= 0 && p.buyIns.length <= 1) return p;
            return {
              ...p,
              buyIns: p.buyIns.map((b) =>
                b.id === buyInId ? { ...b, amount: amtCents } : b,
              ),
            };
          }),
        }));
      },

      removeBuyIn: (playerId, buyInId) => {
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id !== playerId) return p;
            if (p.cashOut != null) return p;
            // Refuse removal if it would leave the player with 0 buy-ins;
            // use Remove Player instead.
            if (p.buyIns.length <= 1) return p;
            return {
              ...p,
              buyIns: p.buyIns.filter((b) => b.id !== buyInId),
            };
          }),
        }));
      },

      cashOutPlayer: (id, amount, opts) => {
        const amtCents = Math.max(0, toCents(amount));
        set((s) => ({
          players: s.players.map((p) =>
            p.id === id
              ? {
                  ...p,
                  cashOut: {
                    amount: amtCents,
                    at: Date.now(),
                    ...(opts?.viaEndGame ? { viaEndGame: true } : {}),
                  },
                }
              : p,
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
        // An empty game has nothing to settle or recap.
        if (s.players.length === 0) return false;
        const anyUnsettled = s.players.some((p) => !p.cashOut);
        if (anyUnsettled) return false;
        set({ endedAt: Date.now() });
        return true;
      },

      reopenGame: () =>
        set((s) => ({
          endedAt: undefined,
          // Undo the End Game settlement: players batch-cashed-out by the
          // end-game flow come back as active, while players who genuinely
          // left mid-game stay settled. Restores the exact pre-end state.
          players: s.players.map((p) =>
            p.cashOut?.viaEndGame ? { ...p, cashOut: undefined } : p,
          ),
        })),

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
      version: 2,
      migrate: (persisted, version) => {
        // v1 stored amounts as dollar floats. Convert to integer cents.
        if (!persisted || typeof persisted !== "object") return persisted;
        if (version >= 2) return persisted;
        const state = persisted as Partial<CashGameState>;
        const toC = (n: unknown): number => {
          const v = typeof n === "number" ? n : Number(n);
          if (!Number.isFinite(v)) return 0;
          return Math.round(v * 100);
        };
        return {
          ...state,
          smallBlind: toC(state.smallBlind),
          bigBlind: toC(state.bigBlind),
          defaultBuyIn: toC(state.defaultBuyIn),
          players: (state.players ?? []).map((p) => ({
            ...p,
            buyIns: (p.buyIns ?? []).map((b) => ({
              ...b,
              amount: toC(b.amount),
            })),
            cashOut: p.cashOut
              ? { ...p.cashOut, amount: toC(p.cashOut.amount) }
              : p.cashOut,
          })),
        } as CashGameState;
      },
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

/** Returns the total of all buy-ins in integer cents. */
export function totalBuyIns(player: CashPlayer): number {
  return player.buyIns.reduce((sum, b) => sum + b.amount, 0);
}

/** Returns net in integer cents, or null if not yet cashed out. */
export function playerNet(player: CashPlayer): number | null {
  if (!player.cashOut) return null;
  return player.cashOut.amount - totalBuyIns(player);
}
