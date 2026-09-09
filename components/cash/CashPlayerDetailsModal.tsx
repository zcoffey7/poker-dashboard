"use client";

import { useId, useMemo, useState } from "react";
import NumberInput from "../NumberInput";
import ModalShell from "../ModalShell";
import CashOutForm from "./CashOutForm";
import { StatBox } from "../StatTiles";
import { useCash, totalBuyIns, playerNet } from "@/lib/cashStore";
import { useCashPlayer } from "@/lib/cashSelectors";
import { fmtMoneyCents, fmtSignedCents, fromCents } from "@/lib/money";
import PlayedClock from "../PlayedClock";

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

  return (
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden"
    >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] gap-2">
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
                className="flex gap-2 mt-1"
              >
                <input
                  id="cash-player-name-edit"
                  className="input flex-1"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  aria-label="Player name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setNameDraft(player.name);
                      setEditingName(false);
                    }
                  }}
                />
                <button className="btn btn-primary btn-sm" type="submit">
                  Save
                </button>
              </form>
            ) : (
              <button
                className="text-lg font-semibold truncate mt-0.5 hover:underline underline-offset-2 block text-left w-full"
                onClick={() => {
                  setNameDraft(player.name);
                  setEditingName(true);
                }}
              >
                {player.name}
              </button>
            )}
            <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-2">
              <span>{cashedOut ? "Cashed out" : "Active"}</span>
              <PlayedClock name={player.name} intervals={player.playIntervals} />
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <StatBox label="Buy-ins" value={`${player.buyIns.length}×`} />
            <StatBox label="In for" value={fmtMoneyCents(totalInCents)} />
            <StatBox
              label={cashedOut ? "Net" : "Out for"}
              value={cashedOut ? fmtSignedCents(netCents ?? 0) : "—"}
              positive={cashedOut ? (netCents ?? 0) >= 0 : undefined}
              muted={cashedOut ? (netCents ?? 0) < 0 : undefined}
            />
          </div>

          {player.cashOut && (
            <div className="card-2 p-3 rounded flex items-center justify-between text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Cash out
                </div>
                <div className="font-mono font-semibold">
                  {fmtMoneyCents(player.cashOut.amount)}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  at {fmtShortTime(player.cashOut.at)}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (
                    confirm(
                      `Reopen ${player.name}? Their cash-out will be cleared and they become active again.`,
                    )
                  ) {
                    reopenPlayer(playerId);
                  }
                }}
                aria-label={`Reopen ${player.name}`}
              >
                Undo
              </button>
            </div>
          )}

          <div>
            <div className="label mb-2">Buy-ins</div>
            {cashedOut && (
              <div className="text-[11px] text-[var(--text-muted)] italic mb-2">
                Cashed out — unlock by reopening.
              </div>
            )}
            <div className="flex flex-col gap-1">
              {player.buyIns.length === 0 && (
                <div className="text-sm text-[var(--text-muted)] italic">
                  No buy-ins recorded.
                </div>
              )}
              {player.buyIns.map((b, idx) =>
                cashedOut ? (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 text-sm p-2 rounded bg-black/20"
                  >
                    <span className="chip text-[10px] min-w-[32px] justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-mono flex-1">
                      {fmtMoneyCents(b.amount)}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {fmtShortTime(b.at)}
                    </span>
                  </div>
                ) : (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 text-sm p-2 rounded bg-black/20"
                  >
                    <span className="chip text-[10px] min-w-[32px] justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-mono shrink-0">$</span>
                    <NumberInput
                      className="input flex-1 font-mono text-sm"
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
                    />
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {fmtShortTime(b.at)}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm !px-2 !py-0.5"
                      onClick={() => {
                        if (player.buyIns.length <= 1) {
                          alert(
                            "Can't remove the only buy-in. Remove the player instead.",
                          );
                          return;
                        }
                        if (confirm("Remove this buy-in entry?"))
                          removeBuyIn(playerId, b.id);
                      }}
                      title="Remove buy-in"
                      aria-label="Remove buy-in"
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
            </div>
            {!cashedOut && (
              <button
                className="btn btn-sm mt-2"
                onClick={() => rebuy(playerId, fromCents(defaultBuyIn))}
              >
                + Add default {fmtMoneyCents(defaultBuyIn)} buy-in
              </button>
            )}
          </div>

          {cashedOut ? (
            <div className="border-t border-[var(--border)] pt-3">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (
                    confirm(
                      `Reopen ${player.name}? Their cash-out will be cleared and they become active again.`,
                    )
                  ) {
                    reopenPlayer(playerId);
                  }
                }}
              >
                Reopen session
              </button>
            </div>
          ) : (
            <div className="border-t border-[var(--border)] pt-3">
              <CashOutForm
                totalInCents={totalInCents}
                onSubmit={(amount) => {
                  cashOutPlayer(playerId, amount);
                  onClose();
                }}
              />
            </div>
          )}
        </div>
    </ModalShell>
  );
}

