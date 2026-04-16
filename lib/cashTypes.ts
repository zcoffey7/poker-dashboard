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
};

export type CashPlayer = {
  id: string;
  name: string;
  seat?: number | null;
  buyIns: CashBuyIn[];
  cashOut?: CashOut;
};

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
