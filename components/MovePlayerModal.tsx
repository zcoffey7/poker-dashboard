"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pushOverlay } from "@/lib/overlayStack";
import { useTournament } from "@/lib/store";

type Props = Readonly<{
  playerId: string;
  onClose: () => void;
}>;

const UNSEATED = "__unseated__";

export default function MovePlayerModal({ playerId, onClose }: Props) {
  const player = useTournament((s) =>
    s.players.find((p) => p.id === playerId),
  );
  const tables = useTournament((s) => s.tables);
  const players = useTournament((s) => s.players);
  const movePlayer = useTournament((s) => s.movePlayer);

  const activeTables = useMemo(
    () => tables.filter((t) => !t.broken),
    [tables],
  );

  const initialTableId = player?.tableId ?? activeTables[0]?.id ?? null;
  const initialSeat = player?.seat ?? 1;

  const [tableId, setTableId] = useState<string | null>(initialTableId);
  const [seat, setSeat] = useState<number>(initialSeat);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const pop = pushOverlay(onClose);
    const dialog = dialogRef.current;
    if (!dialog) return pop;
    if (!dialog.open) dialog.showModal();

    function onBackdropMouseDown(e: MouseEvent) {
      if (!dialog) return;
      const rect = dialog.getBoundingClientRect();
      const clickedOutside =
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom;
      if (clickedOutside) onClose();
    }

    dialog.addEventListener("mousedown", onBackdropMouseDown);
    return () => {
      dialog.removeEventListener("mousedown", onBackdropMouseDown);
      pop();
    };
  }, [onClose]);

  const selectedTable = tables.find((t) => t.id === tableId);

  const occupants = useMemo(() => {
    const map = new Map<number, string>();
    if (!tableId) return map;
    for (const p of players) {
      if (
        p.id !== playerId &&
        !p.eliminated &&
        p.tableId === tableId &&
        typeof p.seat === "number"
      ) {
        map.set(p.seat, p.name);
      }
    }
    return map;
  }, [players, playerId, tableId]);

  if (!player) return null;

  const isUnseatedChoice = tableId === null;
  const seatCount = selectedTable?.seatCount ?? 0;
  const clampedSeat = Math.min(Math.max(seat, 1), Math.max(seatCount, 1));

  const currentDescription = player.tableId
    ? `${tables.find((t) => t.id === player.tableId)?.name ?? "Table"} · Seat ${player.seat}`
    : "Unseated";

  const isSameAsCurrent = isUnseatedChoice
    ? player.tableId == null && player.seat == null
    : tableId === player.tableId && clampedSeat === player.seat;

  const bumpName = isUnseatedChoice ? null : occupants.get(clampedSeat);

  function handleTableChange(value: string) {
    if (value === UNSEATED) {
      setTableId(null);
      return;
    }
    const t = tables.find((tt) => tt.id === value);
    if (!t) return;
    setTableId(t.id);
    if (seat > t.seatCount) setSeat(1);
  }

  function handleConfirm() {
    if (isUnseatedChoice) {
      movePlayer(playerId, { tableId: null, seat: null });
    } else if (selectedTable) {
      movePlayer(playerId, { tableId: selectedTable.id, seat: clampedSeat });
    }
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Move player"
      className="card fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw-2rem,24rem)] p-5 flex-col gap-4 text-text open:flex backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      onClose={onClose}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="label mb-1">Move player</div>
          <div className="text-lg font-semibold truncate">{player.name}</div>
          <div className="text-xs text-muted mt-1">
            Currently: {currentDescription}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          title="Close"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="label" htmlFor="move-table">
          Table
        </label>
        <select
          id="move-table"
          className="input"
          value={tableId ?? UNSEATED}
          onChange={(e) => handleTableChange(e.target.value)}
        >
          <option value={UNSEATED}>Unseated</option>
          {activeTables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!isUnseatedChoice && selectedTable && (
        <div className="flex flex-col gap-2">
          <label className="label" htmlFor="move-seat">
            Seat
          </label>
          <select
            id="move-seat"
            className="input"
            value={clampedSeat}
            onChange={(e) => setSeat(Number(e.target.value))}
          >
            {Array.from({ length: selectedTable.seatCount }, (_, i) => {
              const n = i + 1;
              const occ = occupants.get(n);
              return (
                <option key={n} value={n}>
                  Seat {n}
                  {occ ? ` — occupied by ${occ}` : ""}
                </option>
              );
            })}
          </select>
          {bumpName && (
            <div className="text-xs text-muted">
              {bumpName} will be bumped to Unseated.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={isSameAsCurrent}
        >
          Move
        </button>
      </div>
    </dialog>
  );
}
