"use client";

import { useState } from "react";
import ModalShell, { ModalFooter } from "./ModalShell";
import { useTournament } from "@/lib/store";
import { confirmAction } from "@/lib/confirm";
import PlayedClock from "./PlayedClock";
import { IconMinus, IconPlus, IconTrash, IconX } from "./icons";

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
  const removePlayer = useTournament((s) => s.removePlayer);
  const startedAt = useTournament((s) => s.startedAt);

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

  async function handleUndoRebuy() {
    const ok = await confirmAction({
      title: `Remove one rebuy from ${player!.name}?`,
      confirmLabel: "Remove rebuy",
      tone: "danger",
    });
    if (ok) undoRebuy(player!.id);
  }

  async function handleUndoAddOn() {
    const ok = await confirmAction({
      title: `Remove one add-on from ${player!.name}?`,
      confirmLabel: "Remove add-on",
      tone: "danger",
    });
    if (ok) undoAddOn(player!.id);
  }

  async function handleRemove() {
    const ok = await confirmAction({
      title: `Remove ${player!.name} from the tournament?`,
      message:
        startedAt != null
          ? "Anything they paid (buy-in, rebuys, add-ons) stays in the prize pool."
          : "Use this for a player added by mistake.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    onClose();
    removePlayer(player!.id);
  }

  const status = player.eliminated
    ? `Eliminated${player.finishPlace ? ` · Finished #${player.finishPlace}` : ""}`
    : table
      ? `${table.name} · Seat ${player.seat}`
      : "Unseated";

  return (
    <ModalShell
      onClose={onClose}
      label="Player details"
      cardClassName="w-full sm:max-w-md flex flex-col max-h-[92dvh] overflow-hidden"
    >
      <div className="flex items-start gap-3 px-5 pt-4 pb-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <label className="label" htmlFor="player-name-edit">
            Player
          </label>
          <input
            id="player-name-edit"
            className="input mt-1.5 h-11 text-lg font-semibold"
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
          <div className="text-xs text-muted mt-2 flex items-center gap-2.5">
            <span
              className={`chip ${player.eliminated ? "chip-loss" : table ? "chip-primary" : "chip-gold"}`}
            >
              {status}
            </span>
            <PlayedClock name={player.name} intervals={player.playIntervals} />
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm btn-icon -mr-1.5"
          onClick={onClose}
          aria-label="Close player details"
        >
          <IconX />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2">
        <Row
          label="Buy-in"
          detail={`1 × $${buyIn.toLocaleString()}`}
          total={buyInTotal}
        />
        <StepperRow
          label="Rebuys"
          detail={`${rebuys} × $${rebuyCost.toLocaleString()}${
            rebuyChips > 0 ? ` · ${rebuyChips.toLocaleString()} chips each` : ""
          }`}
          count={rebuys}
          total={rebuyTotal}
          onDecrement={handleUndoRebuy}
          onIncrement={() => rebuyPlayer(player.id)}
          decrementDisabled={rebuys <= 0 || player.eliminated}
          incrementDisabled={rebuyChips <= 0 || player.eliminated}
          decrementLabel={`Remove rebuy from ${player.name}`}
          incrementLabel={`Add rebuy for ${player.name}`}
        />
        <StepperRow
          label="Add-ons"
          detail={`${addOns} × $${addOnCost.toLocaleString()}${
            addOnChips > 0 ? ` · ${addOnChips.toLocaleString()} chips each` : ""
          }`}
          count={addOns}
          total={addOnTotal}
          onDecrement={handleUndoAddOn}
          onIncrement={() => addOnPlayer(player.id)}
          decrementDisabled={addOns <= 0 || player.eliminated}
          incrementDisabled={
            addOnChips <= 0 || addOnCost <= 0 || player.eliminated
          }
          decrementLabel={`Remove add-on from ${player.name}`}
          incrementLabel={`Add add-on for ${player.name}`}
        />

        <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
          <div className="label">Total in for</div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight">
            ${grandTotal.toLocaleString()}
          </div>
        </div>
      </div>

      <ModalFooter className="justify-between">
        <button
          className="btn btn-ghost text-loss hover:text-loss"
          onClick={handleRemove}
        >
          <IconTrash />
          Remove
        </button>
        <button className="btn btn-primary min-w-[6rem]" onClick={onClose}>
          Done
        </button>
      </ModalFooter>
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
    <div className="card-2 flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{detail}</div>
      </div>
      <div className="w-20 text-right font-semibold tabular-nums">
        ${total.toLocaleString()}
      </div>
    </div>
  );
}

function StepperRow({
  label,
  detail,
  count,
  total,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  decrementLabel,
  incrementLabel,
}: {
  label: string;
  detail: string;
  count: number;
  total: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled: boolean;
  incrementDisabled: boolean;
  decrementLabel: string;
  incrementLabel: string;
}) {
  return (
    <div className="card-2 flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{detail}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center rounded-[9px] border border-border-strong bg-surface">
          <button
            className="btn btn-ghost btn-sm btn-icon rounded-r-none"
            onClick={onDecrement}
            disabled={decrementDisabled}
            aria-label={decrementLabel}
          >
            <IconMinus />
          </button>
          <div className="w-8 text-center font-semibold tabular-nums">{count}</div>
          <button
            className="btn btn-ghost btn-sm btn-icon rounded-l-none"
            onClick={onIncrement}
            disabled={incrementDisabled}
            aria-label={incrementLabel}
          >
            <IconPlus />
          </button>
        </div>
        <div className="w-16 text-right font-semibold tabular-nums">
          ${total.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
