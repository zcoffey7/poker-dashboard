"use client";

import { useId, useMemo, useState } from "react";
import { useTournament } from "@/lib/store";
import ModalShell, { ModalFooter, ModalHeader } from "./ModalShell";
import { IconAlert, IconArrowRight } from "./icons";

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
  const titleId = useId();

  const activeTables = useMemo(
    () => tables.filter((t) => !t.broken),
    [tables],
  );

  const initialTableId = player?.tableId ?? activeTables[0]?.id ?? null;
  const initialSeat = player?.seat ?? 1;

  const [tableId, setTableId] = useState<string | null>(initialTableId);
  const [seat, setSeat] = useState<number>(initialSeat);

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
  const targetDescription = isUnseatedChoice
    ? "Unseated"
    : `${selectedTable?.name ?? "Table"} · Seat ${clampedSeat}`;

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
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="w-full sm:max-w-sm flex flex-col overflow-hidden"
    >
      <ModalHeader
        titleId={titleId}
        eyebrow="Move player"
        title={player.name}
        onClose={onClose}
      />

      <div className="p-5 flex flex-col gap-4">
        <div className="card-2 flex items-center gap-2 px-3 py-2.5 text-sm">
          <span className="text-muted truncate">{currentDescription}</span>
          <IconArrowRight className="text-primary shrink-0" />
          <span className="font-semibold truncate">{targetDescription}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="move-table">
            Table
          </label>
          <select
            id="move-table"
            className="select"
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
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="move-seat">
              Seat
            </label>
            <select
              id="move-seat"
              className="select"
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
              <div className="flex items-center gap-1.5 text-xs text-warn">
                <IconAlert />
                {bumpName} will be bumped to Unseated.
              </div>
            )}
          </div>
        )}
      </div>

      <ModalFooter>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary flex-1 sm:flex-none"
          onClick={handleConfirm}
          disabled={isSameAsCurrent}
        >
          Move
        </button>
      </ModalFooter>
    </ModalShell>
  );
}
