"use client";

import { useTournament } from "@/lib/store";
import { useMemo, useState } from "react";
import PlayerDetailsModal from "./PlayerDetailsModal";
import MovePlayerModal from "./MovePlayerModal";
import PlayedClock, { PlayerNameClock } from "./PlayedClock";

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

  return (
    <div className="card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="label">Tables</div>
          <div className="text-sm text-muted mt-1">
            {tables.filter((t) => !t.broken).length} active
            {tables.some((t) => t.broken) &&
              `, ${tables.filter((t) => t.broken).length} broken`}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn btn-sm"
            onClick={() => {
              if (
                confirm(
                  "Clear all seat assignments? Players stay in the tournament but become unseated.",
                )
              ) {
                clearSeats();
              }
            }}
          >
            Clear seats
          </button>
          <button className="btn btn-sm" onClick={() => balanceNow()}>
            Balance now
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => assignSeats()}
          >
            Assign seats
          </button>
        </div>
      </div>

      {unseated.length > 0 && (
        <div className="card-2 p-3">
          <div className="label mb-2">Unseated ({unseated.length})</div>
          <div className="flex flex-wrap gap-2">
            {unseated.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip chip-amber cursor-pointer hover:brightness-110 gap-1.5"
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
          return (
            <div
              key={t.id}
              className={`card-2 p-3 flex flex-col gap-2 ${t.broken ? "opacity-40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted">
                  {seated.length} / {t.seatCount}
                  {t.broken && " • BROKEN"}
                </div>
              </div>
              {seated.length === 0 ? (
                <div className="text-xs text-muted italic py-3 text-center">
                  {t.broken ? "Table broken" : "No players seated"}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {seated.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm rounded-md px-2 py-1.5 hover:bg-black/20 transition-colors"
                    >
                      <span className="chip min-w-[28px] justify-center text-xs shrink-0">
                        {p.seat}
                      </span>
                      <PlayerNameClock
                        name={p.name}
                        intervals={p.playIntervals}
                        onNameClick={() => setDetailsId(p.id)}
                      />
                      <div className="flex gap-1 shrink-0 ml-auto">
                        <button
                          className="btn btn-sm px-2! py-0.5! shrink-0"
                          title="Move to another table or seat"
                          onClick={() => setMoveId(p.id)}
                        >
                          Move
                        </button>
                        <button
                          className="btn btn-danger btn-sm px-2! py-0.5! shrink-0"
                          aria-label={`Eliminate ${p.name}`}
                          onClick={() => {
                            if (
                              confirm(
                                `Eliminate ${p.name}? They'll be assigned the next finish place.`,
                              )
                            ) {
                              eliminatePlayer(p.id);
                            }
                          }}
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
