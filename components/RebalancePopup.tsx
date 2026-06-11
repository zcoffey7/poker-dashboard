"use client";

import ModalShell from "./ModalShell";
import { useTournament } from "@/lib/store";

export default function RebalancePopup() {
  const moves = useTournament((s) => s.pendingRebalanceMoves);
  const acknowledge = useTournament((s) => s.acknowledgeRebalance);

  if (!moves || moves.length === 0) return null;

  const count = moves.length;

  return (
    // No onClose: the popup is blocking and must be acknowledged.
    <ModalShell
      labelledBy="rebalance-title"
      centered
      overlayClassName="bg-black/70 backdrop-blur-sm"
      cardClassName="card-2 w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl"
    >
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="label">Table Rebalance</div>
              <h2
                id="rebalance-title"
                className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1"
              >
                {count} player{count === 1 ? "" : "s"} moving
              </h2>
            </div>
            <span className="chip chip-amber">Action needed</span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Announce each move, then confirm below.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 flex flex-col gap-2">
          {moves.map((m) => (
            <MoveRow key={m.playerId} move={m} />
          ))}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn btn-primary text-base sm:text-lg px-6 py-3"
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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xl sm:text-2xl font-semibold tracking-tight">
          {move.playerName}
        </div>
        {move.reason === "break" && (
          <span className="chip chip-danger">Table broken</span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap text-base sm:text-lg">
        <span className="text-[var(--text-muted)]">{fromLabel}</span>
        <span className="text-[var(--accent)] text-xl font-semibold">→</span>
        <span className="font-semibold">{toLabel}</span>
      </div>
    </div>
  );
}
