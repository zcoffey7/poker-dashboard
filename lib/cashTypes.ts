export type CashBuyIn = {
  id: string;
  amount: number;
  at: number;
};

export type CashOut = {
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
  smallBlind: number;
  bigBlind: number;
  defaultBuyIn: number;
  players: CashPlayer[];
  startedAt?: number;
  endedAt?: number;
};
