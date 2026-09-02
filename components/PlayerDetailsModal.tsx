"use client";

import { useState } from "react";
import ModalShell from "./ModalShell";
import { useTournament } from "@/lib/store";
import PlayedClock from "./PlayedClock";

type Props = {
  playerId: string;
  onClose: () => void;
};

// Parent components must mount this modal with `key={playerId}` so local state
// (e.g. the name input) resets cleanly when a different player is selected,
// rather than relying on an effect-driven sync (which React 19 flags as
// impure via the set-state-in-effect rule).
export default function PlayerDetailsModal({ playerId, onClose }: Props) {
  const player = useTournament((s) =>
    s.players.find((p) => p.id === playerId),
  );
  const tables = useTournament((s) => s.tables);
  const buyIn = useTournament((s) => s.buyIn);
  const rebuyChips = useTournament((s) => s.rebuyChips);
  const rebuyCost = useTournament((s) => s.rebuyCost);
  const addOnChips = useTournament((s) => s.addOnChips);
  const addOnCost = useTournament((s) => s.addOnCost);

  const renamePlayer = useTournament((s) => s.renamePlayer);
  const rebuyPlayer = useTournament((s) => s.rebuyPlayer);
  const undoRebuy = useTournament((s) => s.undoRebuy);
  const addOnPlayer = useTournament((s) => s.addOnPlayer);
  const undoAddOn = useTournament((s) => s.undoAddOn);

  const [name, setName] = useState(() => player?.name ?? "");

  if (!player) return null;

  const rebuys = player.rebuys ?? 0;
  const addOns = player.addOns ?? 0;

  const buyInTotal = buyIn;
  const rebuyTotal = rebuys * rebuyCost;
  const addOnTotal = addOns * addOnCost;
  const grandTotal = buyInTotal + rebuyTotal + addOnTotal;

  const table = tables.find((t) => t.id === player.tableId);

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== player?.name) {
      renamePlayer(player!.id, trimmed);
    } else if (player) {
      setName(player.name);
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      label="Player details"
      centered
      cardClassName="w-full max-w-md p-5 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
    >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <label className="label mb-1" htmlFor="player-name-edit">
              Player
            </label>
            <input
              id="player-name-edit"
              className="input text-lg font-semibold"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setName(player.name);
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === "Enter") {
                  commitName();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-2">
              <span>
                {player.eliminated
                  ? `Eliminated${
                      player.finishPlace ? ` · Finished #${player.finishPlace}` : ""
                    }`
                  : table
                    ? `${table.name} · Seat ${player.seat}`
                    : "Unseated"}
              </span>
              <PlayedClock name={player.name} intervals={player.playIntervals} />
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close player details"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
          <Row
            label="Buy-in"
            detail={`1 × $${buyIn.toLocaleString()}`}
            total={buyInTotal}
          />

          <div className="flex flex-col gap-1 rounded-md bg-black/20 p-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Rebuys</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {rebuys} × ${rebuyCost.toLocaleString()}
                  {rebuyChips > 0 && ` · ${rebuyChips.toLocaleString()} chips each`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-sm !px-2"
                  onClick={() => {
                    if (confirm(`Remove one rebuy from ${player.name}?`))
                      undoRebuy(player.id);
                  }}
                  disabled={rebuys <= 0 || player.eliminated}
                  aria-label={`Remove rebuy from ${player.name}`}
                >
                  −
                </button>
                <div className="w-8 text-center font-semibold">{rebuys}</div>
                <button
                  className="btn btn-ghost btn-sm !px-2"
                  onClick={() => rebuyPlayer(player.id)}
                  disabled={rebuyChips <= 0 || player.eliminated}
                  aria-label={`Add rebuy for ${player.name}`}
                >
                  +
                </button>
                <div className="w-20 text-right font-mono text-sm">
                  ${rebuyTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-md bg-black/20 p-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Add-ons</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {addOns} × ${addOnCost.toLocaleString()}
                  {addOnChips > 0 && ` · ${addOnChips.toLocaleString()} chips each`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-sm !px-2"
                  onClick={() => {
                    if (confirm(`Remove one add-on from ${player.name}?`))
                      undoAddOn(player.id);
                  }}
                  disabled={addOns <= 0 || player.eliminated}
                  aria-label={`Remove add-on from ${player.name}`}
                >
                  −
                </button>
                <div className="w-8 text-center font-semibold">{addOns}</div>
                <button
                  className="btn btn-ghost btn-sm !px-2"
                  onClick={() => addOnPlayer(player.id)}
                  disabled={
                    addOnChips <= 0 || addOnCost <= 0 || player.eliminated
                  }
                  aria-label={`Add add-on for ${player.name}`}
                >
                  +
                </button>
                <div className="w-20 text-right font-mono text-sm">
                  ${addOnTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div className="label">Total in for</div>
          <div className="text-2xl font-bold">
            ${grandTotal.toLocaleString()}
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
    </ModalShell>
  );
}

function Row({
  label,
  detail,
  total,
}: {
  label: string;
  detail: string;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-black/20 p-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-[var(--text-muted)]">{detail}</div>
      </div>
      <div className="w-20 text-right font-mono text-sm">
        ${total.toLocaleString()}
      </div>
    </div>
  );
}
