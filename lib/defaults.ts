import type {
  BlindLevel,
  PayoutSpot,
  Table,
  TournamentSettings,
} from "./types";

export const DEFAULT_BLIND_STRUCTURE: BlindLevel[] = [
  { level: 1, smallBlind: 100, bigBlind: 200, ante: 0, durationSec: 20 * 60 },
  { level: 2, smallBlind: 200, bigBlind: 400, ante: 0, durationSec: 20 * 60 },
  { level: 3, smallBlind: 300, bigBlind: 600, ante: 0, durationSec: 20 * 60 },
  { level: 4, smallBlind: 400, bigBlind: 800, ante: 0, durationSec: 20 * 60 },
  { level: 5, smallBlind: 500, bigBlind: 1000, ante: 0, durationSec: 20 * 60 },
  { level: 6, smallBlind: 600, bigBlind: 1200, ante: 0, durationSec: 20 * 60 },
  { level: 7, smallBlind: 800, bigBlind: 1600, ante: 0, durationSec: 20 * 60 },
  { level: 8, smallBlind: 1000, bigBlind: 2000, ante: 0, durationSec: 20 * 60 },
  { level: 9, smallBlind: 2000, bigBlind: 4000, ante: 0, durationSec: 20 * 60 },
  { level: 10, smallBlind: 3000, bigBlind: 6000, ante: 0, durationSec: 20 * 60 },
  { level: 11, smallBlind: 4000, bigBlind: 8000, ante: 0, durationSec: 20 * 60 },
  { level: 12, smallBlind: 5000, bigBlind: 10000, ante: 0, durationSec: 20 * 60 },
  { level: 13, smallBlind: 10000, bigBlind: 20000, ante: 0, durationSec: 20 * 60 },
];

export const DEFAULT_PAYOUTS: PayoutSpot[] = [
  { place: 1, percent: 50 },
  { place: 2, percent: 30 },
  { place: 3, percent: 20 },
];

export const DEFAULT_TABLES: Table[] = [
  { id: "t1", name: "Table 1", seatCount: 9 },
  { id: "t2", name: "Table 2", seatCount: 9 },
];

export const DEFAULT_SETTINGS: TournamentSettings = {
  soundEnabled: true,
  warnSec: 60,
  autoBalance: true,
  seatingMode: "spread",
};

export const DEFAULT_TOURNAMENT_NAME = "Home Game Tournament";
export const DEFAULT_STARTING_STACK = 30000;
export const DEFAULT_BUY_IN = 20;
export const DEFAULT_REBUY_CHIPS = 30000;
export const DEFAULT_ADD_ON_CHIPS = 25000;
export const DEFAULT_ADD_ON_COST = 10;
