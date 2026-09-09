import {
  formatStandingsCsv,
  money,
  net,
  parseStandingsCsv,
} from "./csv";
import {
  applySessionToCsv,
  applySessionToGames,
  findDuplicateSession,
  formatGamesFile,
  normalizeSession,
  parseGamesFile,
  sessionBuyIn,
  sessionCashOut,
} from "./session";
import type {
  GameEntry,
  SessionDraft,
  StandingsCsv,
  StandingsFiles,
} from "./types";

/** Per-player before/after, mirroring the summary table the skill produces. */
export type StandingsChange = {
  name: string;
  gamesBefore: number;
  gamesAfter: number;
  netBefore: number;
  netAfter: number;
  isNewPlayer: boolean;
};

export type StandingsUpdate = {
  files: StandingsFiles;
  entry: GameEntry;
  session: SessionDraft;
  /** Overall-CSV deltas for everyone who played this session. */
  changes: StandingsChange[];
  /** Non-fatal issues worth showing before publishing. */
  warnings: string[];
  duplicateOf?: GameEntry;
};

function totals(csv: StandingsCsv) {
  return {
    games: csv.rows.reduce((s, r) => s + r.games, 0),
    buyIn: csv.rows.reduce((s, r) => s + r.totalBuyIn, 0),
    cashOut: csv.rows.reduce((s, r) => s + r.totalCashOut, 0),
    net: csv.rows.reduce((s, r) => s + net(r), 0),
  };
}

/**
 * The skill's step 7 sanity checks, as assertions rather than prose. These
 * guard against a bug in the fold itself, so a failure here must block the
 * commit rather than warn.
 */
function assertConsistentDelta(
  beforeOverall: StandingsCsv,
  afterOverall: StandingsCsv,
  beforeMode: StandingsCsv,
  afterMode: StandingsCsv,
  session: SessionDraft,
): void {
  const overallDelta = diff(totals(beforeOverall), totals(afterOverall));
  const modeDelta = diff(totals(beforeMode), totals(afterMode));

  const expected = {
    games: session.players.length,
    buyIn: sessionBuyIn(session),
    cashOut: sessionCashOut(session),
    net: sessionCashOut(session) - sessionBuyIn(session),
  };

  for (const key of ["games", "buyIn", "cashOut", "net"] as const) {
    if (Math.abs(overallDelta[key] - expected[key]) > 0.005) {
      throw new Error(
        `Overall ${key} moved by ${overallDelta[key]}, expected ${expected[key]}`,
      );
    }
    if (Math.abs(modeDelta[key] - expected[key]) > 0.005) {
      throw new Error(
        `${session.mode} ${key} moved by ${modeDelta[key]}, expected ${expected[key]}`,
      );
    }
  }
}

function diff(
  before: ReturnType<typeof totals>,
  after: ReturnType<typeof totals>,
) {
  return {
    games: after.games - before.games,
    buyIn: after.buyIn - before.buyIn,
    cashOut: after.cashOut - before.cashOut,
    net: after.net - before.net,
  };
}

/**
 * Fold a finished session into the three standings files. Pure: takes the
 * current file contents, returns the new ones. The caller decides how to
 * persist them.
 */
export function buildStandingsUpdate(
  current: StandingsFiles,
  draft: SessionDraft,
): StandingsUpdate {
  const session = normalizeSession(draft);
  const warnings: string[] = [];

  if (session.players.length === 0) {
    throw new Error("A session needs at least one player.");
  }

  const buyIn = sessionBuyIn(session);
  const cashOut = sessionCashOut(session);
  if (buyIn !== cashOut) {
    const gap = cashOut - buyIn;
    warnings.push(
      `Session is off by $${money(Math.abs(gap))} — buy-ins total $${money(
        buyIn,
      )} but cash-outs total $${money(cashOut)}.`,
    );
  }

  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const p of session.players) {
    if (seen.has(p.name)) repeated.add(p.name);
    seen.add(p.name);
  }
  if (repeated.size > 0) {
    warnings.push(
      `${[...repeated].join(", ")} appears twice — they'd be counted as two sessions.`,
    );
  }

  const beforeOverall = parseStandingsCsv(current.overallCsv);
  const beforeMode = parseStandingsCsv(current.modeCsv);
  const afterOverall = applySessionToCsv(beforeOverall, session);
  const afterMode = applySessionToCsv(beforeMode, session);

  assertConsistentDelta(
    beforeOverall,
    afterOverall,
    beforeMode,
    afterMode,
    session,
  );

  const beforeGames = parseGamesFile(current.gamesJson);
  const duplicateOf = findDuplicateSession(beforeGames, session);
  if (duplicateOf) {
    warnings.push(
      `A session with the same date and results is already recorded as "${duplicateOf.id}".`,
    );
  }
  const { games: afterGames, entry } = applySessionToGames(
    beforeGames,
    session,
  );

  return {
    files: {
      overallCsv: formatStandingsCsv(afterOverall),
      modeCsv: formatStandingsCsv(afterMode),
      gamesJson: formatGamesFile(afterGames),
    },
    entry,
    session,
    changes: describeChanges(beforeOverall, afterOverall, session),
    warnings,
    duplicateOf,
  };
}

function describeChanges(
  before: StandingsCsv,
  after: StandingsCsv,
  session: SessionDraft,
): StandingsChange[] {
  const beforeByName = new Map(before.rows.map((r) => [r.player, r]));
  const afterByName = new Map(after.rows.map((r) => [r.player, r]));
  const names = [...new Set(session.players.map((p) => p.name))];

  return names.map((name) => {
    const prev = beforeByName.get(name);
    const next = afterByName.get(name);
    return {
      name,
      gamesBefore: prev?.games ?? 0,
      gamesAfter: next?.games ?? 0,
      netBefore: prev ? net(prev) : 0,
      netAfter: next ? net(next) : 0,
      isNewPlayer: !prev,
    };
  });
}
