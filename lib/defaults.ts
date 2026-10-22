import type {
  BlindLevel,
  ChipDenom,
  PayoutSpot,
  Table,
  TournamentSettings,
} from "./types";

export const DEFAULT_BLIND_STRUCTURE: BlindLevel[] = [
  { id: "bl_def_1", level: 1, smallBlind: 100, bigBlind: 200, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_2", level: 2, smallBlind: 200, bigBlind: 400, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_3", level: 3, smallBlind: 300, bigBlind: 600, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_4", level: 4, smallBlind: 400, bigBlind: 800, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_5", level: 5, smallBlind: 500, bigBlind: 1000, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_6", level: 6, smallBlind: 0, bigBlind: 0, ante: 0, durationSec: 10 * 60, isBreak: true },
  { id: "bl_def_7", level: 7, smallBlind: 500, bigBlind: 1500, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_8", level: 8, smallBlind: 1000, bigBlind: 2000, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_9", level: 9, smallBlind: 2000, bigBlind: 4000, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_10", level: 10, smallBlind: 3000, bigBlind: 6000, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_11", level: 11, smallBlind: 4000, bigBlind: 8000, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_12", level: 12, smallBlind: 0, bigBlind: 0, ante: 0, durationSec: 10 * 60, isBreak: true },
  { id: "bl_def_13", level: 13, smallBlind: 5000, bigBlind: 10000, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_14", level: 14, smallBlind: 10000, bigBlind: 20000, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_15", level: 15, smallBlind: 20000, bigBlind: 40000, ante: 0, durationSec: 20 * 60 },
  { id: "bl_def_16", level: 16, smallBlind: 30000, bigBlind: 60000, ante: 0, durationSec: 20 * 60 },
];

export const DEFAULT_PAYOUTS: PayoutSpot[] = [
  { place: 1, percent: 100 },
];

export const DEFAULT_CHIP_DENOMS: ChipDenom[] = [
  { id: "c1", value: 100, color: "white" },
  { id: "c2", value: 500, color: "green" },
  { id: "c3", value: 1000, color: "blue" },
  { id: "c4", value: 25000, color: "red" },
  { id: "c5", value: 5000, color: "black" },
];

export const DEFAULT_TABLES: Table[] = [
  { id: "t1", name: "Table 1", seatCount: 9 },
];

export const DEFAULT_SETTINGS: TournamentSettings = {
  soundEnabled: true,
  warnSec: 60,
  autoBalance: true,
  seatingMode: "spread",
  bountiesEnabled: false,
};

export const DEFAULT_TOURNAMENT_NAME = "Home Game Tournament";
export const DEFAULT_STARTING_STACK = 30000;
export const DEFAULT_BUY_IN = 20;
export const DEFAULT_REBUY_CHIPS = 30000;
export const DEFAULT_REBUY_COST = DEFAULT_BUY_IN;
export const DEFAULT_ADD_ON_CHIPS = 25000;
export const DEFAULT_ADD_ON_COST = 10;
