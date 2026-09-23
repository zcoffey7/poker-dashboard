"use client";

import { useState } from "react";
import { useTournament } from "@/lib/store";
import { confirmAction } from "@/lib/confirm";
import PlayerDetailsModal from "./PlayerDetailsModal";
import { PlayerNameClock } from "./PlayedClock";
import { IconPlus, IconUndo, IconUserPlus } from "./icons";

export default function PlayerRoster() {
  const players = useTournament((s) => s.players);
  const addPlayer = useTournament((s) => s.addPlayer);
  const addPlayersBulk = useTournament((s) => s.addPlayersBulk);
  const eliminatePlayer = useTournament((s) => s.eliminatePlayer);
  const restorePlayer = useTournament((s) => s.restorePlayer);
  const rebuyPlayer = useTournament((s) => s.rebuyPlayer);
  const rebuyChips = useTournament((s) => s.rebuyChips);
  const addOnPlayer = useTournament((s) => s.addOnPlayer);
  const addOnChips = useTournament((s) => s.addOnChips);
  const addOnCost = useTournament((s) => s.addOnCost);

  const [name, setName] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const active = players.filter((p) => !p.eliminated);
  const eliminated = players
    .filter((p) => p.eliminated)
    .sort((a, b) => (a.finishPlace ?? 0) - (b.finishPlace ?? 0));

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addPlayer(name);
    setName("");
  }

  function handleBulk() {
    const lines = bulk
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length) addPlayersBulk(lines);
    setBulk("");
    setShowBulk(false);
  }

  async function handleEliminate(p: (typeof players)[number]) {
    const ok = await confirmAction({
      title: `Eliminate ${p.name}?`,
      message: "They'll be assigned the next finish place.",
      confirmLabel: "Eliminate",
      tone: "danger",
    });
    if (ok) eliminatePlayer(p.id);
  }

  async function handleRestore(p: (typeof players)[number]) {
    const ok = await confirmAction({
      title: `Restore ${p.name}?`,
      message: "They return to the active field and their finish place is cleared.",
      confirmLabel: "Restore",
    });
    if (ok) restorePlayer(p.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {active.length} active · {eliminated.length} out
        </div>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setShowBulk((v) => !v)}
        >
          {showBulk ? "Cancel bulk" : "Bulk add"}
        </button>
      </div>

      {showBulk ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="label">Bulk player names</span>
            <textarea
              id="bulk-players"
              className="input min-h-[110px] text-sm"
              placeholder="One name per line (or comma separated)"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            />
          </label>
          <button
            className="btn btn-primary btn-sm self-end"
            onClick={handleBulk}
            disabled={!bulk.trim()}
          >
            Add all
          </button>
        </div>
      ) : (
        <form onSubmit={handleAdd} className="flex gap-2">
          <label htmlFor="player-name" className="sr-only">
            Player name
          </label>
          <input
            id="player-name"
            className="input"
            placeholder="Player name"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!name.trim()}
          >
            <IconUserPlus />
            Add
          </button>
        </form>
      )}

      <div className="card-2 p-1.5 flex flex-col">
        {active.length === 0 && (
          <div className="text-sm text-muted italic px-3 py-4 text-center">
            No players yet. Add one above.
          </div>
        )}
        {active.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm px-2.5 py-2 rounded-lg hover:bg-hover transition-colors"
          >
            <PlayerNameClock
              name={p.name}
              intervals={p.playIntervals}
              onNameClick={() => setDetailsId(p.id)}
              nameAriaLabel={`View details for ${p.name}`}
            />
            {(p.rebuys ?? 0) > 0 && (
              <span
                className="chip chip-info"
                title={`${p.rebuys} rebuy${p.rebuys === 1 ? "" : "s"}`}
              >
                R{p.rebuys}
              </span>
            )}
            {(p.addOns ?? 0) > 0 && (
              <span
                className="chip chip-primary"
                title={`${p.addOns} add-on${p.addOns === 1 ? "" : "s"}`}
              >
                A{p.addOns}
              </span>
            )}
            {/* Phones: full-width row of equal buttons under the name. */}
            <div className="grid grid-flow-col auto-cols-fr gap-1.5 w-full sm:w-auto sm:flex sm:ml-auto sm:shrink-0">
              {rebuyChips > 0 && (
                <button
                  className="btn btn-xs"
                  onClick={() => rebuyPlayer(p.id)}
                  aria-label={`Rebuy for ${p.name}`}
                  title="Rebuy"
                >
                  <IconPlus />
                  Rebuy
                </button>
              )}
              {/* Same guard as PlayerDetailsModal: add-ons need a price. */}
              {addOnChips > 0 && addOnCost > 0 && (
                <button
                  className="btn btn-xs"
                  onClick={() => addOnPlayer(p.id)}
                  aria-label={`Add-on for ${p.name}`}
                  title="Add-on"
                >
                  <IconPlus />
                  Add-on
                </button>
              )}
              <button
                className="btn btn-danger btn-xs"
                onClick={() => handleEliminate(p)}
                aria-label={`Eliminate ${p.name}`}
              >
                Out
              </button>
            </div>
          </div>
        ))}
      </div>

      {eliminated.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="label px-1">Eliminated</div>
          <div className="flex flex-col">
            {eliminated.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm px-2.5 py-1.5 rounded-lg text-muted hover:bg-hover transition-colors"
              >
                <span className="chip chip-loss min-w-[2.5rem] justify-center tabular-nums shrink-0">
                  #{p.finishPlace}
                </span>
                <PlayerNameClock
                  name={p.name}
                  intervals={p.playIntervals}
                  onNameClick={() => setDetailsId(p.id)}
                  nameAriaLabel={`View details for ${p.name}`}
                  struck
                />
                <button
                  className="btn btn-ghost btn-xs shrink-0 ml-auto"
                  onClick={() => handleRestore(p)}
                  aria-label={`Restore ${p.name}`}
                >
                  <IconUndo />
                  Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailsId && (
        <PlayerDetailsModal
          key={detailsId}
          playerId={detailsId}
          onClose={() => setDetailsId(null)}
        />
      )}
    </div>
  );
}
