"use client";

import { useState } from "react";
import { useTournament } from "@/lib/store";
import PlayerDetailsModal from "./PlayerDetailsModal";
import PlayedClock from "./PlayedClock";

export default function PlayerRoster() {
  const players = useTournament((s) => s.players);
  const addPlayer = useTournament((s) => s.addPlayer);
  const addPlayersBulk = useTournament((s) => s.addPlayersBulk);
  const removePlayer = useTournament((s) => s.removePlayer);
  const eliminatePlayer = useTournament((s) => s.eliminatePlayer);
  const restorePlayer = useTournament((s) => s.restorePlayer);
  const rebuyPlayer = useTournament((s) => s.rebuyPlayer);
  const rebuyChips = useTournament((s) => s.rebuyChips);
  const addOnPlayer = useTournament((s) => s.addOnPlayer);
  const addOnChips = useTournament((s) => s.addOnChips);
  const addOnCost = useTournament((s) => s.addOnCost);
  const startedAt = useTournament((s) => s.startedAt);

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

  function handleRemove(p: (typeof players)[number]) {
    const startedMsg =
      startedAt != null
        ? " Anything they paid (buy-in, rebuys, add-ons) stays in the prize pool."
        : "";
    if (!confirm(`Remove ${p.name} from the tournament?${startedMsg}`)) return;
    removePlayer(p.id);
  }

  function handleEliminate(p: (typeof players)[number]) {
    if (
      !confirm(
        `Eliminate ${p.name}? They'll be assigned the next finish place.`,
      )
    ) {
      return;
    }
    eliminatePlayer(p.id);
  }

  function handleRestore(p: (typeof players)[number]) {
    if (
      !confirm(
        `Restore ${p.name} to the active field? Their finish place will be cleared.`,
      )
    ) {
      return;
    }
    restorePlayer(p.id);
  }

  return (
    <div className="card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Players</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            {active.length} active, {eliminated.length} out
          </div>
        </div>
        <button
          className="btn btn-sm"
          onClick={() => setShowBulk((v) => !v)}
        >
          {showBulk ? "Cancel bulk" : "Bulk add"}
        </button>
      </div>

      {showBulk ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="label">Bulk player names</span>
            <textarea
              id="bulk-players"
              className="input min-h-[100px] font-mono text-xs"
              placeholder="One name per line (or comma separated)"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            />
          </label>
          <button
            className="btn btn-primary btn-sm"
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
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!name.trim()}
          >
            Add
          </button>
        </form>
      )}

      <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto scrollbar-thin -mr-2 pr-2">
        {active.length === 0 && (
          <div className="text-sm text-[var(--text-muted)] italic py-2">
            No players yet. Add one above.
          </div>
        )}
        {active.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-black/20"
          >
            <button
              className="flex-1 text-left truncate cursor-pointer hover:underline underline-offset-2 min-w-0"
              onClick={() => setDetailsId(p.id)}
              aria-label={`View details for ${p.name}`}
            >
              {p.name}
            </button>
            <PlayedClock name={p.name} intervals={p.playIntervals} />
            {(p.rebuys ?? 0) > 0 && (
              <span
                className="chip chip-accent text-[10px]"
                title={`${p.rebuys} rebuy${p.rebuys === 1 ? "" : "s"}`}
              >
                R{p.rebuys}
              </span>
            )}
            {(p.addOns ?? 0) > 0 && (
              <span
                className="chip chip-green text-[10px]"
                title={`${p.addOns} add-on${p.addOns === 1 ? "" : "s"}`}
              >
                A{p.addOns}
              </span>
            )}
            <div className="flex gap-1">
              {rebuyChips > 0 && (
                <button
                  className="btn btn-ghost btn-sm !px-2 !py-0.5"
                  onClick={() => rebuyPlayer(p.id)}
                  aria-label={`Rebuy for ${p.name}`}
                >
                  +R
                </button>
              )}
              {/* Same guard as PlayerDetailsModal: add-ons need a price. */}
              {addOnChips > 0 && addOnCost > 0 && (
                <button
                  className="btn btn-ghost btn-sm !px-2 !py-0.5"
                  onClick={() => addOnPlayer(p.id)}
                  aria-label={`Add-on for ${p.name}`}
                >
                  +A
                </button>
              )}
              <button
                className="btn btn-danger btn-sm !px-2 !py-0.5"
                onClick={() => handleEliminate(p)}
                aria-label={`Eliminate ${p.name}`}
              >
                Out
              </button>
              <button
                className="btn btn-ghost btn-sm !px-2 !py-0.5"
                onClick={() => handleRemove(p)}
                aria-label={`Remove ${p.name} from tournament`}
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {detailsId && (
          <PlayerDetailsModal
            key={detailsId}
            playerId={detailsId}
            onClose={() => setDetailsId(null)}
          />
        )}
        {eliminated.length > 0 && (
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <div className="label mb-2">Eliminated</div>
            {eliminated.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-sm px-2 py-1 rounded text-[var(--text-muted)]"
              >
                <span className="chip chip-danger text-[10px] min-w-[30px] justify-center">
                  #{p.finishPlace}
                </span>
                <button
                  className="flex-1 text-left truncate line-through cursor-pointer hover:no-underline"
                  onClick={() => setDetailsId(p.id)}
                  aria-label={`View details for ${p.name}`}
                >
                  {p.name}
                </button>
                <PlayedClock name={p.name} intervals={p.playIntervals} />
                <button
                  className="btn btn-ghost btn-sm !px-2 !py-0.5"
                  onClick={() => handleRestore(p)}
                  aria-label={`Restore ${p.name}`}
                >
                  Undo
                </button>
                <button
                  className="btn btn-ghost btn-sm !px-2 !py-0.5"
                  onClick={() => handleRemove(p)}
                  title="Remove from tournament"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
