"use client";

import { useState } from "react";
import { useCash, playerNet } from "@/lib/cashStore";
import { fmtStackWithBBs, playerStackCents } from "@/lib/cashStack";
import { fmtMoneyCents, fmtSignedCents, fromCents } from "@/lib/money";
import BuyInDialog from "./BuyInDialog";
import CashOutDialog from "./CashOutDialog";
import CashPlayerDetailsModal from "./CashPlayerDetailsModal";
import { PlayerNameClock } from "../PlayedClock";

export default function CashPlayerRoster() {
  const players = useCash((s) => s.players);
  const bigBlind = useCash((s) => s.bigBlind);
  const defaultBuyIn = useCash((s) => s.defaultBuyIn);
  const addPlayer = useCash((s) => s.addPlayer);
  const removePlayer = useCash((s) => s.removePlayer);
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

  return (
    <div className="card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Players</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            {active.length} active, {settled.length} cashed out
          </div>
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
          placeholder="Player name"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!addName.trim()}
        >
          Add
        </button>
      </form>

      <div className="flex flex-col gap-1">
        {active.length === 0 && settled.length === 0 && (
          <div className="text-sm text-[var(--text-muted)] italic py-2">
            No players yet. Add one above.
          </div>
        )}
        {active.map((p) => {
          const stack = playerStackCents(p);
          const stackLabel =
            bigBlind > 0
              ? fmtStackWithBBs(stack, bigBlind)
              : fmtMoneyCents(stack);
          return (
            <div
              key={`${p.id}:${stack}`}
              data-testid="cash-active-player-row"
              data-player={p.name}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm px-2 py-1.5 rounded hover:bg-black/20"
            >
              <PlayerNameClock
                name={p.name}
                intervals={p.playIntervals}
                onNameClick={() => setDetailsId(p.id)}
              />
              <span
                className="chip chip-accent text-[10px] shrink-0"
                title={`${p.buyIns.length} buy-in${p.buyIns.length === 1 ? "" : "s"}`}
              >
                {p.buyIns.length}×
              </span>
              <span
                className="font-mono text-xs tabular-nums text-right shrink-0"
                data-testid="cash-player-stack"
                data-player={p.name}
              >
                {stackLabel}
              </span>
              <div className="flex gap-1 shrink-0 ml-auto">
                <button
                  className="btn btn-ghost btn-sm !px-2 !py-0.5"
                  onClick={() => setRebuyId(p.id)}
                  title="Add another buy-in"
                >
                  +$
                </button>
                <button
                  className="btn btn-danger btn-sm !px-2 !py-0.5"
                  onClick={() => setCashOutId(p.id)}
                  title="Cash out this player"
                >
                  Cash Out
                </button>
                <button
                  className="btn btn-ghost btn-sm !px-2 !py-0.5"
                  onClick={() => {
                    if (
                      confirm(
                        `Remove ${p.name}? This erases their buy-ins — use Cash Out for $0 if they busted.`,
                      )
                    )
                      removePlayer(p.id);
                  }}
                  title="Remove from game"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}

        {settled.length > 0 && (
          <div className="mt-3 border-t border-[var(--border)] pt-3">
            <div className="label mb-2">Cashed Out</div>
            {settled.map((p) => {
              const net = playerNet(p) ?? 0;
              const positive = net >= 0;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm px-2 py-1 rounded text-[var(--text-muted)]"
                >
                  <PlayerNameClock
                    name={p.name}
                    intervals={p.playIntervals}
                    onNameClick={() => setDetailsId(p.id)}
                    nameClassName="text-[var(--text)]"
                  />
                  <span
                    className={`font-mono text-xs tabular-nums font-semibold min-w-[72px] text-right shrink-0 ${
                      positive
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {fmtSignedCents(net)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm !px-2 !py-0.5 shrink-0"
                    onClick={() => {
                      if (
                        confirm(
                          `Reopen ${p.name}? Their cash-out will be cleared and they become active again.`,
                        )
                      ) {
                        reopenPlayer(p.id);
                      }
                    }}
                    aria-label={`Reopen ${p.name}`}
                  >
                    Undo
                  </button>
                  <button
                    className="btn btn-ghost btn-sm !px-2 !py-0.5 shrink-0"
                    onClick={() => {
                      if (confirm(`Remove ${p.name} from the game?`))
                        removePlayer(p.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}
