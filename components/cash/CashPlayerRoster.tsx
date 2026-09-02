"use client";

import { useState } from "react";
import { useCash, totalBuyIns, playerNet } from "@/lib/cashStore";
import { fmtMoneyCents, fmtSignedCents, fromCents } from "@/lib/money";
import BuyInDialog from "./BuyInDialog";
import CashOutDialog from "./CashOutDialog";
import CashPlayerDetailsModal from "./CashPlayerDetailsModal";
import PlayedClock from "../PlayedClock";

export default function CashPlayerRoster() {
  const players = useCash((s) => s.players);
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
          const totalIn = totalBuyIns(p);
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-black/20"
            >
              <button
                className="flex-1 text-left truncate cursor-pointer hover:underline underline-offset-2 min-w-0"
                onClick={() => setDetailsId(p.id)}
                title="View details"
              >
                {p.name}
              </button>
              <PlayedClock name={p.name} intervals={p.playIntervals} />
              <span
                className="chip chip-accent text-[10px]"
                title={`${p.buyIns.length} buy-in${p.buyIns.length === 1 ? "" : "s"}`}
              >
                {p.buyIns.length}×
              </span>
              <span className="font-mono text-xs tabular-nums min-w-[64px] text-right">
                {fmtMoneyCents(totalIn)}
              </span>
              <div className="flex gap-1">
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
                  className="flex items-center gap-2 text-sm px-2 py-1 rounded text-[var(--text-muted)]"
                >
                  <button
                    className="flex-1 text-left truncate cursor-pointer hover:underline underline-offset-2 min-w-0 text-[var(--text)]"
                    onClick={() => setDetailsId(p.id)}
                    title="View details"
                  >
                    {p.name}
                  </button>
                  <PlayedClock name={p.name} intervals={p.playIntervals} />
                  <span
                    className={`font-mono text-xs tabular-nums font-semibold min-w-[72px] text-right ${
                      positive
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {fmtSignedCents(net)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm !px-2 !py-0.5"
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
                    className="btn btn-ghost btn-sm !px-2 !py-0.5"
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
