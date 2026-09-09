export type GameMode = "cash" | "tournament";

/** One player's line in a finished session, in whole dollars. */
export type SessionPlayer = {
  name: string;
  buyIn: number;
  cashOut: number;
  buyIns: number;
};

/** A finished session, ready to be folded into the standings. */
export type SessionDraft = {
  /** YYYY-MM-DD */
  date: string;
  title: string;
  mode: GameMode;
  durationMinutes?: number;
  players: SessionPlayer[];
};

/**
 * A standings row. Only the three independent quantities are stored; every
 * other column in the CSV (averages, net, net per game) is derived, which is
 * exactly the invariant the standings page and its integration test assert.
 */
export type StandingsRow = {
  games: number;
  player: string;
  totalBuyIn: number;
  totalCashOut: number;
};

export type StandingsCsv = {
  /** Preserved verbatim so round-tripping never rewrites the header. */
  header: string;
  rows: StandingsRow[];
};

export type GameEntry = {
  id: string;
  date: string;
  title: string;
  mode: GameMode;
  durationMinutes?: number;
  players: SessionPlayer[];
};

export type GamesFile = {
  games: GameEntry[];
};

/** The three files a session update always touches. */
export type StandingsFiles = {
  overallCsv: string;
  modeCsv: string;
  gamesJson: string;
};

export const OVERALL_CSV_PATH = "stats/PokerSummary.csv";
export const CASH_CSV_PATH = "stats/PokerCashSummary.csv";
export const TOURNAMENT_CSV_PATH = "stats/PokerTournamentSummary.csv";
export const GAMES_JSON_PATH = "stats/games.json";

export function modeCsvPath(mode: GameMode): string {
  return mode === "cash" ? CASH_CSV_PATH : TOURNAMENT_CSV_PATH;
}
