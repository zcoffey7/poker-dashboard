import { canonicalName } from "./aliases";
import type {
  GameEntry,
  GamesFile,
  SessionDraft,
  SessionPlayer,
  StandingsCsv,
  StandingsRow,
} from "./types";

export function kebabCase(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "game"
  );
}

/** `{date}-{kebab-title}`, suffixed with -2, -3, … when already taken. */
export function makeGameId(
  date: string,
  title: string,
  taken: ReadonlySet<string>,
): string {
  const base = `${date}-${kebabCase(title)}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Apply the alias table and drop empty rows. */
export function normalizeSession(session: SessionDraft): SessionDraft {
  return {
    ...session,
    title: session.title.trim() || "Home Game",
    players: session.players
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: canonicalName(p.name),
        buyIn: Math.round(p.buyIn),
        cashOut: Math.round(p.cashOut),
        buyIns: Math.max(1, Math.round(p.buyIns)),
      })),
  };
}

export function sessionBuyIn(session: SessionDraft): number {
  return session.players.reduce((s, p) => s + p.buyIn, 0);
}

export function sessionCashOut(session: SessionDraft): number {
  return session.players.reduce((s, p) => s + p.cashOut, 0);
}

/**
 * Fold a session into one standings CSV. Existing players keep their row
 * position (so equal-net ties stay stable); newcomers are appended and land
 * wherever the net sort puts them.
 */
export function applySessionToCsv(
  csv: StandingsCsv,
  session: SessionDraft,
): StandingsCsv {
  const rows: StandingsRow[] = csv.rows.map((r) => ({ ...r }));
  const byName = new Map(rows.map((r) => [r.player, r]));

  for (const player of session.players) {
    const existing = byName.get(player.name);
    if (existing) {
      existing.games += 1;
      existing.totalBuyIn += player.buyIn;
      existing.totalCashOut += player.cashOut;
      continue;
    }
    const created: StandingsRow = {
      games: 1,
      player: player.name,
      totalBuyIn: player.buyIn,
      totalCashOut: player.cashOut,
    };
    rows.push(created);
    byName.set(player.name, created);
  }

  return { header: csv.header, rows };
}

/**
 * Stable identity for "this exact night's results", used to remember what has
 * already been published so a second tap can't double-count a session.
 */
export function sessionFingerprint(session: SessionDraft): string {
  const players = session.players
    .map((p) => `${p.name}:${p.buyIn}:${p.cashOut}`)
    .sort()
    .join("|");
  return `${session.mode}:${session.date}:${players}`;
}

function samePlayers(
  a: readonly SessionPlayer[],
  b: readonly SessionPlayer[],
): boolean {
  if (a.length !== b.length) return false;
  const key = (p: SessionPlayer) => `${p.name}:${p.buyIn}:${p.cashOut}`;
  const left = [...a].map(key).sort();
  const right = [...b].map(key).sort();
  return left.every((v, i) => v === right[i]);
}

/**
 * An already-recorded session with the same date, mode and player results.
 * Used to stop a double tap on "Update Sheet" from counting a night twice.
 */
export function findDuplicateSession(
  games: GamesFile,
  session: SessionDraft,
): GameEntry | undefined {
  return games.games.find(
    (g) =>
      g.date === session.date &&
      g.mode === session.mode &&
      samePlayers(g.players, session.players),
  );
}

export function buildGameEntry(
  games: GamesFile,
  session: SessionDraft,
): GameEntry {
  const taken = new Set(games.games.map((g) => g.id));
  const entry: GameEntry = {
    id: makeGameId(session.date, session.title, taken),
    date: session.date,
    title: session.title,
    mode: session.mode,
    players: session.players.map((p) => ({
      name: p.name,
      buyIn: p.buyIn,
      cashOut: p.cashOut,
      buyIns: p.buyIns,
    })),
  };
  if (session.durationMinutes != null && session.durationMinutes > 0) {
    // Key order matters only for readability of the committed diff: the
    // existing file puts durationMinutes before players.
    return {
      id: entry.id,
      date: entry.date,
      title: entry.title,
      mode: entry.mode,
      durationMinutes: Math.round(session.durationMinutes),
      players: entry.players,
    };
  }
  return entry;
}

/** Prepend the session to the history file (most recent first). */
export function applySessionToGames(
  games: GamesFile,
  session: SessionDraft,
): { games: GamesFile; entry: GameEntry } {
  const entry = buildGameEntry(games, session);
  return { games: { games: [entry, ...games.games] }, entry };
}

export function parseGamesFile(text: string): GamesFile {
  const parsed: unknown = JSON.parse(text);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as GamesFile).games)
  ) {
    throw new Error("games.json must be an object with a `games` array");
  }
  return parsed as GamesFile;
}

export function formatGamesFile(games: GamesFile): string {
  return `${JSON.stringify(games, null, 2)}\n`;
}
