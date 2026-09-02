import type { PlayInterval } from "./playTime";

export type CashBuyIn = {
  id: string;
  /** Stored as integer cents. */
  amount: number;
  at: number;
};

export type CashOut = {
  /** Stored as integer cents. */
  amount: number;
  at: number;
  /**
   * True when this cash-out was recorded by the End Game batch settlement
   * rather than the player leaving mid-game. `reopenGame` reverses exactly
   * these, restoring the pre-end state.
   */
  viaEndGame?: boolean;
};

export type CashPlayer = {
  id: string;
  name: string;
  buyIns: CashBuyIn[];
  cashOut?: CashOut;
  /**
   * Seated stints. Opens on buy-in, closes on cash-out, reopens if they
   * sit back down. Gaps between stints don't count as time played.
   */
  playIntervals: PlayInterval[];
}

export type CashGameState = {
  name: string;
  /** Stored as integer cents. */
  smallBlind: number;
  /** Stored as integer cents. */
  bigBlind: number;
  /** Stored as integer cents. */
  defaultBuyIn: number;
  players: CashPlayer[];
  startedAt?: number;
  endedAt?: number;
};
