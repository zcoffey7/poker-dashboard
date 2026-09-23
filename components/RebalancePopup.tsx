"use client";

import ModalShell from "./ModalShell";
import { useTournament } from "@/lib/store";
import { IconArrowRight, IconShuffle } from "./icons";

export default function RebalancePopup() {
  const moves = useTournament((s) => s.pendingRebalanceMoves);
  const acknowledge = useTournament((s) => s.acknowledgeRebalance);

  if (!moves || moves.length === 0) return null;

  const count = moves.length;

  return (
    // No onClose: the popup is blocking and must be acknowledged.
    <ModalShell
      labelledBy="rebalance-title"
      variant="center"
      cardClassName="w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden"
    >
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold text-xl ring-1 ring-gold/30">
              <IconShuffle />
            </span>
            <div>
              <div className="label">Table rebalance</div>
              <h2
                id="rebalance-title"
                className="text-2xl sm:text-3xl font-semibold tracking-tight"
              >
                {count} player{count === 1 ? "" : "s"} moving
              </h2>
            </div>
          </div>
          <span className="chip chip-gold">Action needed</span>
        </div>
        <p className="text-sm text-muted mt-3">
          Announce each move, then confirm below.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-2.5">
        {moves.map((m) => (
          <MoveRow key={m.playerId} move={m} />
        ))}
      </div>

      <div className="px-5 sm:px-6 py-4 border-t border-border bg-surface-2/60 flex items-center justify-end">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={acknowledge}
          autoFocus
        >
          Acknowledged
        </button>
      </div>
    </ModalShell>
  );
}

type MoveRowProps = {
  readonly move: NonNullable<
    ReturnType<typeof useTournament.getState>["pendingRebalanceMoves"]
  >[number];
};

function MoveRow({ move }: MoveRowProps) {
  const seatedBefore = move.fromTableId && move.fromTableName;
  const fromSeatSuffix = move.fromSeat != null ? ` · Seat ${move.fromSeat}` : "";
  const fromLabel = seatedBefore
    ? `${move.fromTableName}${fromSeatSuffix}`
    : "Unseated";
  const toLabel = `${move.toTableName} · Seat ${move.toSeat}`;

  return (
    <div className="card-2 px-4 py-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xl sm:text-2xl font-semibold tracking-tight">
          {move.playerName}
        </div>
        {move.reason === "break" && (
          <span className="chip chip-loss">Table broken</span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap text-base sm:text-lg">
        <span className="text-muted">{fromLabel}</span>
        <IconArrowRight className="text-primary" />
        <span className="font-semibold text-primary">{toLabel}</span>
      </div>
    </div>
  );
}
