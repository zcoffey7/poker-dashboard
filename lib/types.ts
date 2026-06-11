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
  /**
   * Chip count captured at the moment of elimination so a later
   * `restorePlayer` can restore the real stack instead of resetting
   * back to `startingStack`.
   */
  chipsBeforeElim?: number;
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

export type ChipColor =
  | "white"
  | "red"
  | "green"
  | "black"
  | "blue"
  | "purple"
  | "yellow"
  | "orange"
  | "pink"
  | "gray";

export type ChipDenom = {
  id: string;
  value: number;
  color: ChipColor;
};

export type ClockState = {
  currentLevel: number;
  remainingSec: number;
  running: boolean;
  lastTickAt: number;
  /**
   * Wall-clock timestamp for when the *current* level started (adjusted for
   * any pre-existing progress). Used to reconcile `remainingSec` against real
   * elapsed time so the clock doesn't drift in background tabs and catches up
   * after page reloads. `null` until the clock has been started at least once.
   */
  levelStartedAt: number | null;
};

export type TournamentSettings = {
  soundEnabled: boolean;
  warnSec: number;
  autoBalance: boolean;
  seatingMode: "spread" | "fill";
};

export type FinishType = "winner" | "chop" | "elimination";

export type RebalanceMove = {
  playerId: string;
  playerName: string;
  fromTableId: string | null;
  fromTableName: string | null;
  fromSeat: number | null;
  toTableId: string;
  toTableName: string;
  toSeat: number;
  reason: "break" | "balance";
};

export type TournamentState = {
  name: string;
  startingStack: number;
  buyIn: number;
  rebuyChips: number;
  rebuyCost: number;
  addOnChips: number;
  addOnCost: number;
  tables: Table[];
  players: Player[];
  blindStructure: BlindLevel[];
  payouts: PayoutSpot[];
  chipDenoms: ChipDenom[];
  clock: ClockState;
  settings: TournamentSettings;
  startedAt?: number;
  finishedAt?: number;
  finishType?: FinishType;
  /**
   * Player id -> percentage of the prize pool (0..100) to award on a chop.
   * Legacy field kept so previously-finished tournaments still render;
   * new chops record dollar amounts in `chopAmounts` instead.
   * Only meaningful when finishType === "chop".
   */
  chopShares?: Record<string, number>;
  /**
   * Player id -> exact dollar amount to award on a chop. Sum should be
   * <= prize pool; any remainder stays unpaid. Takes precedence over
   * `chopShares`. Only meaningful when finishType === "chop".
   */
  chopAmounts?: Record<string, number>;
  /**
   * Moves produced by the most recent `balanceTables` run that the user
   * hasn't acknowledged yet. When non-empty the dashboard shows a modal
   * listing every player who needs to get up and where to sit.
   */
  pendingRebalanceMoves?: RebalanceMove[];
};
