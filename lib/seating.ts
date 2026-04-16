import type { Player, Table } from "./types";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = arr.slice();
  const rand =
    seed === undefined ? Math.random : mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomAssign(
  players: Player[],
  tables: Table[],
  mode: "spread" | "fill" = "spread",
  seed?: number,
): Player[] {
  const active = tables.filter((t) => !t.broken);
  if (active.length === 0) return players.map((p) => ({ ...p }));

  const living = players.filter((p) => !p.eliminated);
  // Derive distinct but deterministic sub-seeds from the caller's seed so
  // each shuffle step is independent yet reproducible.
  const shuffled = shuffle(living, seed);

  const byTable: Record<string, number[]> = {};
  active.forEach((t, idx) => {
    byTable[t.id] = Array.from({ length: t.seatCount }, (_, i) => i + 1);
    byTable[t.id] = shuffle(
      byTable[t.id],
      seed === undefined ? undefined : (seed + idx + 1) >>> 0,
    );
  });

  const assignments = new Map<string, { tableId: string; seat: number }>();

  if (mode === "spread") {
    let ti = 0;
    for (const p of shuffled) {
      // skip tables whose seats are exhausted
      let guard = 0;
      while (byTable[active[ti % active.length].id].length === 0) {
        ti++;
        if (guard++ > active.length) break;
      }
      const table = active[ti % active.length];
      const seat = byTable[table.id].pop();
      if (seat !== undefined) {
        assignments.set(p.id, { tableId: table.id, seat });
      }
      ti++;
    }
  } else {
    let ai = 0;
    for (const p of shuffled) {
      while (
        ai < active.length &&
        byTable[active[ai].id].length === 0
      ) {
        ai++;
      }
      if (ai >= active.length) break;
      const table = active[ai];
      const seat = byTable[table.id].pop();
      if (seat !== undefined) {
        assignments.set(p.id, { tableId: table.id, seat });
      }
    }
  }

  return players.map((p) => {
    if (p.eliminated) return { ...p, tableId: null, seat: null };
    const a = assignments.get(p.id);
    return a
      ? { ...p, tableId: a.tableId, seat: a.seat }
      : { ...p, tableId: null, seat: null };
  });
}

function tableCounts(
  players: Player[],
  tables: Table[],
): Record<string, Player[]> {
  const map: Record<string, Player[]> = {};
  tables.forEach((t) => (map[t.id] = []));
  for (const p of players) {
    if (p.eliminated || !p.tableId) continue;
    if (map[p.tableId]) map[p.tableId].push(p);
  }
  return map;
}

// Balance tables: if max-min >= 2, move players from fullest to shortest;
// additionally, break a table when total remaining players fit on (tables-1)
// tables AND this table has the fewest players.
export function balanceTables(
  players: Player[],
  tables: Table[],
): { players: Player[]; tables: Table[] } {
  let nextPlayers = players.map((p) => ({ ...p }));
  let nextTables = tables.map((t) => ({ ...t }));

  let safety = 50;
  while (safety-- > 0) {
    const activeTables = nextTables.filter((t) => !t.broken);
    if (activeTables.length <= 1) break;

    const livingCount = nextPlayers.filter((p) => !p.eliminated).length;
    const counts = tableCounts(nextPlayers, activeTables);

    // Try to break a table if players fit on fewer tables
    const otherSeats = activeTables
      .slice()
      .sort((a, b) => counts[a.id].length - counts[b.id].length);
    const shortest = otherSeats[0];
    const remainingSeats = activeTables
      .filter((t) => t.id !== shortest.id)
      .reduce((s, t) => s + t.seatCount, 0);

    if (
      activeTables.length > 1 &&
      livingCount <= remainingSeats
    ) {
      // Break the shortest table: redistribute its players across the rest
      const toMove = counts[shortest.id];
      const remaining = activeTables.filter((t) => t.id !== shortest.id);
      const remainingCounts = tableCounts(nextPlayers, remaining);
      for (const mover of toMove) {
        // pick the destination table with fewest players and open seats
        const dest = remaining
          .filter(
            (t) =>
              remainingCounts[t.id].length < t.seatCount,
          )
          .sort(
            (a, b) =>
              remainingCounts[a.id].length - remainingCounts[b.id].length,
          )[0];
        if (!dest) break;
        const used = new Set(remainingCounts[dest.id].map((p) => p.seat));
        let seat = 1;
        while (used.has(seat)) seat++;
        nextPlayers = nextPlayers.map((p) =>
          p.id === mover.id ? { ...p, tableId: dest.id, seat } : p,
        );
        remainingCounts[dest.id].push({
          ...mover,
          tableId: dest.id,
          seat,
        });
      }
      nextTables = nextTables.map((t) =>
        t.id === shortest.id ? { ...t, broken: true } : t,
      );
      continue;
    }

    // Otherwise perform single moves while imbalance >= 2
    const sorted = activeTables
      .slice()
      .sort((a, b) => counts[b.id].length - counts[a.id].length);
    const fullest = sorted[0];
    // Walk from shortest upward until we find one with an open seat; if every
    // table is full there is no move to make.
    const shortTable = sorted
      .slice()
      .reverse()
      .find((t) => counts[t.id].length < t.seatCount);
    if (!shortTable) break;
    if (counts[fullest.id].length - counts[shortTable.id].length < 2) break;

    // Pick a player to move - deterministically choose highest seat # as proxy for "just posted BB"
    const candidates = counts[fullest.id]
      .slice()
      .sort((a, b) => (b.seat ?? 0) - (a.seat ?? 0));
    const mover = candidates[0];
    if (!mover) break;

    const used = new Set(counts[shortTable.id].map((p) => p.seat));
    let seat = 1;
    while (used.has(seat)) seat++;

    nextPlayers = nextPlayers.map((p) =>
      p.id === mover.id
        ? { ...p, tableId: shortTable.id, seat }
        : p,
    );
  }

  return { players: nextPlayers, tables: nextTables };
}
