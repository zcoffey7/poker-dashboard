export type Player = {
  id: string;
  name: string;
  tableId: string | null;
  seat: number | null;
  chips: number;
  rebuys: number;
  addOns: number;
  eliminated: boolean;
  eliminatedAt?: number;
  finishPlace?: number;
};

export type Table = {
  id: string;
  name: string;
  seatCount: number;
  broken?: boolean;
};

export type BlindLevel = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationSec: number;
  isBreak?: boolean;
};

export type PayoutSpot = {
  place: number;
  percent: number;
};

export type ClockState = {
  currentLevel: number;
  remainingSec: number;
  running: boolean;
  lastTickAt: number;
};

export type TournamentSettings = {
  soundEnabled: boolean;
  warnSec: number;
  autoBalance: boolean;
  seatingMode: "spread" | "fill";
};

export type FinishType = "winner" | "chop";

export type TournamentState = {
  name: string;
  startingStack: number;
  buyIn: number;
  rebuyChips: number;
  addOnChips: number;
  addOnCost: number;
  tables: Table[];
  players: Player[];
  blindStructure: BlindLevel[];
  payouts: PayoutSpot[];
  clock: ClockState;
  settings: TournamentSettings;
  startedAt?: number;
  finishedAt?: number;
  finishType?: FinishType;
  /**
   * Player id -> percentage of the prize pool (0..100) to award on a chop.
   * Sum should be <= total payout percentage; any remainder stays unpaid.
   * Only meaningful when finishType === "chop".
   */
  chopShares?: Record<string, number>;
};
