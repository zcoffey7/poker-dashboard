"use client";

import { useId, useMemo, useState } from "react";
import NumberInput from "../NumberInput";
import ModalShell from "../ModalShell";
import CashOutForm from "./CashOutForm";
import { StatBox, netTone } from "../StatTiles";
import { useCash, totalBuyIns, playerNet } from "@/lib/cashStore";
import { useCashPlayer } from "@/lib/cashSelectors";
import { confirmAction, showNotice } from "@/lib/confirm";
import { fmtMoneyCents, fmtSignedCents, fromCents } from "@/lib/money";
import PlayedClock from "../PlayedClock";
import { IconPlus, IconTrash, IconUndo, IconX } from "../icons";

type Props = {
  playerId: string;
  onClose: () => void;
};

function fmtShortTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CashPlayerDetailsModal({ playerId, onClose }: Props) {
  const player = useCashPlayer(playerId);
  const renamePlayer = useCash((s) => s.renamePlayer);
  const rebuy = useCash((s) => s.rebuy);
  const editBuyIn = useCash((s) => s.editBuyIn);
  const removeBuyIn = useCash((s) => s.removeBuyIn);
  const reopenPlayer = useCash((s) => s.reopenPlayer);
  const cashOutPlayer = useCash((s) => s.cashOutPlayer);
  const removePlayer = useCash((s) => s.removePlayer);
  const defaultBuyIn = useCash((s) => s.defaultBuyIn);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(player?.name ?? "");
  const titleId = useId();

  const totalInCents = useMemo(
    () => (player ? totalBuyIns(player) : 0),
    [player],
  );
  const netCents = player ? playerNet(player) : null;

  if (!player) return null;

  const cashedOut = player.cashOut != null;

  async function handleReopen() {
    const ok = await confirmAction({
      title: `Reopen ${player!.name}?`,
      message: "Their cash-out is cleared and they're back in the game.",
      confirmLabel: "Reopen",
    });
    if (ok) reopenPlayer(playerId);
  }

  async function handleRemoveBuyIn(buyInId: string) {
    if (player!.buyIns.length <= 1) {
      await showNotice(
        "Can't remove the only buy-in",
        "Remove the player instead.",
      );
      return;
    }
    const ok = await confirmAction({
      title: "Remove this buy-in entry?",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (ok) removeBuyIn(playerId, buyInId);
  }

  async function handleRemovePlayer() {
    const ok = await confirmAction({
      title: `Remove ${player!.name}?`,
      message: cashedOut
        ? "They disappear from this game and its recap."
        : "This erases their buy-ins. If they busted, cash them out for $0 instead.",
      confirmLabel: "Remove player",
      tone: "danger",
    });
    if (!ok) return;
    onClose();
    removePlayer(playerId);
  }

  return (
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="w-full sm:max-w-md max-h-[92dvh] flex flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 px-4 sm:px-5 pt-4 pb-3.5 border-b border-border shrink-0">
        <div className="min-w-0 flex-1">
          <div className="label" id={titleId}>
            Player
          </div>
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                renamePlayer(playerId, nameDraft);
                setEditingName(false);
              }}
              className="flex gap-2 mt-1.5"
            >
              <input
                id="cash-player-name-edit"
                className="input flex-1"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                aria-label="Player name"
                autoFocus
                enterKeyHint="done"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setNameDraft(player.name);
                    setEditingName(false);
                  }
                }}
              />
              <button className="btn btn-primary" type="submit">
                Save
              </button>
            </form>
          ) : (
            <button
              className="text-xl font-semibold tracking-tight truncate mt-0.5 block text-left w-full rounded hover:text-primary transition-colors"
              onClick={() => {
                setNameDraft(player.name);
                setEditingName(true);
              }}
              title="Rename player"
            >
              {player.name}
            </button>
          )}
          <div className="text-xs text-muted mt-1.5 flex items-center gap-2.5">
            <span className={`chip ${cashedOut ? "" : "chip-primary"}`}>
              {cashedOut ? "Cashed out" : "Seated"}
            </span>
            <PlayedClock name={player.name} intervals={player.playIntervals} />
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm btn-icon -mr-1.5"
          onClick={onClose}
          aria-label="Close"
        >
          <IconX />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Buy-ins" value={`${player.buyIns.length}×`} />
          <StatBox label="In for" value={fmtMoneyCents(totalInCents)} />
          <StatBox
            label={cashedOut ? "Net" : "Out for"}
            value={cashedOut ? fmtSignedCents(netCents ?? 0) : "—"}
            tone={cashedOut ? netTone(netCents ?? 0) : undefined}
          />
        </div>

        {player.cashOut && (
          <div className="card-2 px-3.5 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="label">Cashed out</div>
              <div className="text-lg font-semibold tabular-nums">
                {fmtMoneyCents(player.cashOut.amount)}
              </div>
              <div className="text-xs text-muted">
                at {fmtShortTime(player.cashOut.at)}
              </div>
            </div>
            <button
              className="btn btn-sm"
              onClick={handleReopen}
              aria-label={`Reopen ${player.name}`}
            >
              <IconUndo />
              Reopen
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <div className="label">Buy-ins</div>
            {cashedOut && (
              <div className="text-xs text-muted">Reopen to edit</div>
            )}
          </div>
          {player.buyIns.length === 0 && (
            <div className="text-sm text-muted italic">No buy-ins recorded.</div>
          )}
          <div className="flex flex-col gap-1.5">
            {player.buyIns.map((b, idx) =>
              cashedOut ? (
                <div
                  key={b.id}
                  className="card-2 flex items-center gap-3 px-3 py-2.5 text-sm"
                >
                  <span className="chip min-w-[2.25rem] justify-center tabular-nums">
                    #{idx + 1}
                  </span>
                  <span className="flex-1 font-semibold tabular-nums">
                    {fmtMoneyCents(b.amount)}
                  </span>
                  <span className="text-xs text-muted shrink-0">
                    {fmtShortTime(b.at)}
                  </span>
                </div>
              ) : (
                <div
                  key={b.id}
                  className="card-2 flex items-center gap-2.5 px-2.5 py-2 text-sm"
                >
                  <span className="chip min-w-[2.25rem] justify-center tabular-nums">
                    #{idx + 1}
                  </span>
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
                      $
                    </span>
                    <NumberInput
                      className="input input-sm pl-6 tabular-nums"
                      value={fromCents(b.amount)}
                      onChange={(n) => editBuyIn(playerId, b.id, n)}
                      // Wired straight to the store: committing per
                      // keystroke would persist transient $0 while typing.
                      commitOnBlur
                      // Restore the previous amount if the field is left
                      // empty rather than zeroing the buy-in.
                      emptyValue={fromCents(b.amount)}
                      step={0.01}
                      min={0}
                      aria-label={`Buy-in ${idx + 1} amount`}
                    />
                  </div>
                  <span className="text-xs text-muted shrink-0">
                    {fmtShortTime(b.at)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => handleRemoveBuyIn(b.id)}
                    title="Remove buy-in"
                    aria-label="Remove buy-in"
                  >
                    <IconTrash />
                  </button>
                </div>
              ),
            )}
          </div>
          {!cashedOut && (
            <button
              className="btn btn-sm self-start mt-0.5"
              onClick={() => rebuy(playerId, fromCents(defaultBuyIn))}
            >
              <IconPlus />
              Add {fmtMoneyCents(defaultBuyIn)} buy-in
            </button>
          )}
        </div>

        {!cashedOut && (
          <div className="border-t border-border pt-4">
            <CashOutForm
              totalInCents={totalInCents}
              onSubmit={(amount) => {
                cashOutPlayer(playerId, amount);
                onClose();
              }}
            />
          </div>
        )}

        <div className="border-t border-border pt-3">
          <button
            className="btn btn-ghost btn-sm text-loss hover:text-loss"
            onClick={handleRemovePlayer}
          >
            <IconTrash />
            Remove player
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
