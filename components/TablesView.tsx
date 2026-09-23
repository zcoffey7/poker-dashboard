"use client";

import { useTournament } from "@/lib/store";
import { useMemo, useState } from "react";
import { confirmAction } from "@/lib/confirm";
import PlayerDetailsModal from "./PlayerDetailsModal";
import MovePlayerModal from "./MovePlayerModal";
import PlayedClock, { PlayerNameClock } from "./PlayedClock";
import { IconArrowLeftRight, IconEraser, IconScale, IconShuffle } from "./icons";

export default function TablesView() {
  const tables = useTournament((s) => s.tables);
  const players = useTournament((s) => s.players);
  const assignSeats = useTournament((s) => s.assignSeats);
  const balanceNow = useTournament((s) => s.balanceNow);
  const clearSeats = useTournament((s) => s.clearSeats);
  const eliminatePlayer = useTournament((s) => s.eliminatePlayer);

  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);

  const byTable = useMemo(() => {
    const map: Record<string, typeof players> = {};
    tables.forEach((t) => (map[t.id] = []));
    players.forEach((p) => {
      if (p.tableId && map[p.tableId]) map[p.tableId].push(p);
    });
    Object.keys(map).forEach((k) => {
      map[k] = map[k].toSorted((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
    });
    return map;
  }, [tables, players]);

  const unseated = players.filter((p) => !p.eliminated && !p.tableId);
  const activeTables = tables.filter((t) => !t.broken).length;
  const brokenTables = tables.length - activeTables;

  async function handleClearSeats() {
    const ok = await confirmAction({
      title: "Clear all seat assignments?",
      message: "Players stay in the tournament but become unseated.",
      confirmLabel: "Clear seats",
      tone: "danger",
    });
    if (ok) clearSeats();
  }

  async function handleEliminate(id: string, name: string) {
    const ok = await confirmAction({
      title: `Eliminate ${name}?`,
      message: "They'll be assigned the next finish place.",
      confirmLabel: "Eliminate",
      tone: "danger",
    });
    if (ok) eliminatePlayer(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-muted">
          {activeTables} active table{activeTables === 1 ? "" : "s"}
          {brokenTables > 0 && `, ${brokenTables} broken`}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <button
            className="btn btn-sm"
            onClick={handleClearSeats}
            aria-label="Clear seats"
          >
            <IconEraser />
            <span className="sm:hidden">Clear</span>
            <span className="hidden sm:inline">Clear seats</span>
          </button>
          <button
            className="btn btn-sm"
            onClick={() => balanceNow()}
            aria-label="Balance now"
          >
            <IconScale />
            <span className="sm:hidden">Balance</span>
            <span className="hidden sm:inline">Balance now</span>
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => assignSeats()}
            aria-label="Assign seats"
          >
            <IconShuffle />
            <span className="sm:hidden">Assign</span>
            <span className="hidden sm:inline">Assign seats</span>
          </button>
        </div>
      </div>

      {unseated.length > 0 && (
        <div className="rounded-xl border border-dashed border-gold/45 bg-gold/5 p-3">
          <div className="label text-gold mb-2">Unseated · {unseated.length}</div>
          <div className="flex flex-wrap gap-2">
            {unseated.map((p) => (
              <button
                key={p.id}
                type="button"
                className="inline-flex items-center gap-2 h-8 rounded-full border border-gold/40 bg-surface px-3 text-sm font-medium hover:border-gold transition-colors"
                onClick={() => setMoveId(p.id)}
                title="Seat player"
              >
                <span className="whitespace-nowrap">{p.name}</span>
                <PlayedClock name={p.name} intervals={p.playIntervals} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
        {tables.map((t) => {
          const seated = byTable[t.id] ?? [];
          const full = seated.length >= t.seatCount;
          return (
            <div
              key={t.id}
              className={`card-2 p-3 flex flex-col gap-2 ${t.broken ? "opacity-45" : ""}`}
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="font-semibold">{t.name}</div>
                <div className="flex items-center gap-2">
                  {t.broken && <span className="chip chip-loss">Broken</span>}
                  <span className={`chip tabular-nums ${full ? "chip-gold" : ""}`}>
                    {seated.length} / {t.seatCount}
                  </span>
                </div>
              </div>
              {seated.length === 0 ? (
                <div className="text-sm text-muted italic py-4 text-center">
                  {t.broken ? "Table broken" : "No players seated"}
                </div>
              ) : (
                <div className="flex flex-col">
                  {seated.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm rounded-lg px-1.5 py-1.5 hover:bg-hover transition-colors"
                    >
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold tabular-nums text-muted"
                        title={`Seat ${p.seat}`}
                      >
                        {p.seat}
                      </span>
                      <PlayerNameClock
                        name={p.name}
                        intervals={p.playIntervals}
                        onNameClick={() => setDetailsId(p.id)}
                      />
                      <div className="flex gap-1.5 shrink-0 ml-auto">
                        <button
                          className="btn btn-xs"
                          title="Move to another table or seat"
                          onClick={() => setMoveId(p.id)}
                        >
                          <IconArrowLeftRight />
                          Move
                        </button>
                        <button
                          className="btn btn-danger btn-xs"
                          aria-label={`Eliminate ${p.name}`}
                          onClick={() => handleEliminate(p.id, p.name)}
                        >
                          Out
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {detailsId && (
        <PlayerDetailsModal
          key={detailsId}
          playerId={detailsId}
          onClose={() => setDetailsId(null)}
        />
      )}

      {moveId && (
        <MovePlayerModal
          key={moveId}
          playerId={moveId}
          onClose={() => setMoveId(null)}
        />
      )}
    </div>
  );
}
