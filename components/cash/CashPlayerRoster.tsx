"use client";

import { useState } from "react";
import { useCash, playerNet } from "@/lib/cashStore";
import { fmtBBCount, playerStackCents, stackBB } from "@/lib/cashStack";
import { fmtMoneyCents, fmtSignedCents, fromCents } from "@/lib/money";
import { confirmAction } from "@/lib/confirm";
import BuyInDialog from "./BuyInDialog";
import CashOutDialog from "./CashOutDialog";
import CashPlayerDetailsModal from "./CashPlayerDetailsModal";
import PlayedClock, { PlayerNameClock } from "../PlayedClock";
import { IconLogOut, IconPlus, IconUndo, IconUserPlus } from "../icons";

export default function CashPlayerRoster() {
  const players = useCash((s) => s.players);
  const bigBlind = useCash((s) => s.bigBlind);
  const defaultBuyIn = useCash((s) => s.defaultBuyIn);
  const addPlayer = useCash((s) => s.addPlayer);
  const reopenPlayer = useCash((s) => s.reopenPlayer);

  const [addName, setAddName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [rebuyId, setRebuyId] = useState<string | null>(null);
  const [cashOutId, setCashOutId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const active = players.filter((p) => !p.cashOut);
  const settled = players
    .filter((p) => !!p.cashOut)
    .sort(
      (a, b) => (playerNet(b) ?? 0) - (playerNet(a) ?? 0),
    );

  function openAdd() {
    if (!addName.trim()) return;
    setAddOpen(true);
  }

  async function handleReopen(id: string, name: string) {
    const ok = await confirmAction({
      title: `Reopen ${name}?`,
      message: "Their cash-out is cleared and they're back in the game.",
      confirmLabel: "Reopen",
    });
    if (ok) reopenPlayer(id);
  }

  return (
    <section aria-label="Players" className="card p-3 sm:p-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="font-semibold tracking-tight">Players</h2>
        <div className="text-sm text-muted">
          {active.length} seated · {settled.length} cashed out
        </div>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          openAdd();
        }}
      >
        <label htmlFor="cash-add-player" className="sr-only">
          Player name
        </label>
        <input
          id="cash-add-player"
          className="input"
          placeholder="Add a player"
          autoComplete="off"
          enterKeyHint="go"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
        />
        <button
          className="btn btn-primary shrink-0"
          type="submit"
          disabled={!addName.trim()}
        >
          <IconUserPlus />
          Add
        </button>
      </form>

      {active.length === 0 && settled.length === 0 && (
        <div className="text-sm text-muted text-center py-6">
          No players yet. Add the first one above.
        </div>
      )}

      {active.length > 0 && (
        <ul className="flex flex-col gap-2">
          {active.map((p) => {
            const stack = playerStackCents(p);
            const buyIns = p.buyIns.length;
            return (
              <li
                key={p.id}
                data-testid="cash-active-player-row"
                data-player={p.name}
                className="card-2 px-3.5 py-3 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="block max-w-full truncate text-left text-base font-semibold rounded hover:text-primary transition-colors"
                      onClick={() => setDetailsId(p.id)}
                      title="View details"
                    >
                      {p.name}
                    </button>
                    <div className="mt-1 flex items-center gap-2 text-xs text-subtle">
                      <PlayedClock name={p.name} intervals={p.playIntervals} />
                      <span aria-hidden="true">·</span>
                      <span className={buyIns > 1 ? "text-info" : ""}>
                        {buyIns} buy-in{buyIns === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div
                    className="shrink-0 text-right tabular-nums"
                    data-testid="cash-player-stack"
                    data-player={p.name}
                  >
                    <span className="block text-xl font-semibold leading-tight tracking-tight">
                      {fmtMoneyCents(stack)}
                    </span>
                    {bigBlind > 0 && (
                      <>
                        <span className="sr-only"> · </span>
                        <span className="block text-xs text-muted mt-0.5">
                          {fmtBBCount(stackBB(stack, bigBlind))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="btn btn-sm"
                    onClick={() => setRebuyId(p.id)}
                    title="Add another buy-in"
                  >
                    <IconPlus />
                    Rebuy
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setCashOutId(p.id)}
                    title="Cash out this player"
                  >
                    <IconLogOut />
                    Cash Out
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {settled.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="label px-1">Cashed out</div>
          <ul className="flex flex-col">
            {settled.map((p) => {
              const net = playerNet(p) ?? 0;
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-2 px-1 py-1.5 border-b border-border last:border-0"
                >
                  <PlayerNameClock
                    name={p.name}
                    intervals={p.playIntervals}
                    onNameClick={() => setDetailsId(p.id)}
                    nameClassName="text-muted"
                  />
                  <span
                    className={`text-right font-semibold tabular-nums shrink-0 ${
                      net > 0 ? "text-gain" : net < 0 ? "text-loss" : "text-muted"
                    }`}
                  >
                    {fmtSignedCents(net)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm shrink-0"
                    onClick={() => handleReopen(p.id, p.name)}
                    aria-label={`Reopen ${p.name}`}
                  >
                    <IconUndo />
                    Undo
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {addOpen && (
        <BuyInDialog
          title={`Buy-in for ${addName.trim()}`}
          defaultAmount={fromCents(defaultBuyIn)}
          onSubmit={(amount) => {
            addPlayer(addName, amount);
            setAddName("");
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
          confirmLabel="Seat Player"
        />
      )}
      {rebuyId && (
        <BuyInDialog
          title="Rebuy"
          subtitle={players.find((p) => p.id === rebuyId)?.name}
          defaultAmount={fromCents(defaultBuyIn)}
          onSubmit={(amount) => {
            useCash.getState().rebuy(rebuyId, amount);
            setRebuyId(null);
          }}
          onClose={() => setRebuyId(null)}
          confirmLabel="Add Buy-in"
        />
      )}
      {cashOutId && (
        <CashOutDialog
          playerId={cashOutId}
          onClose={() => setCashOutId(null)}
        />
      )}
      {detailsId && (
        <CashPlayerDetailsModal
          playerId={detailsId}
          onClose={() => setDetailsId(null)}
        />
      )}
    </section>
  );
}
