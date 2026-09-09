"use client";

import { useId, useMemo } from "react";
import ModalShell from "../ModalShell";
import CashOutForm from "./CashOutForm";
import { StatBox } from "../StatTiles";
import { useCash, totalBuyIns } from "@/lib/cashStore";
import { useCashPlayer } from "@/lib/cashSelectors";
import { fmtMoneyCents } from "@/lib/money";

type Props = {
  playerId: string;
  onClose: () => void;
};

export default function CashOutDialog({ playerId, onClose }: Props) {
  const player = useCashPlayer(playerId);
  const cashOutPlayer = useCash((s) => s.cashOutPlayer);

  const titleId = useId();

  const totalInCents = useMemo(
    () => (player ? totalBuyIns(player) : 0),
    [player],
  );

  if (!player) return null;

  return (
    <ModalShell
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="w-full max-w-sm flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="min-w-0">
          <div className="label" id={titleId}>
            Cash Out
          </div>
          <div className="text-sm font-semibold mt-0.5 truncate">
            {player.name}
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

      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <StatBox label="Buy-ins" value={`${player.buyIns.length}×`} />
          <StatBox label="In for" value={fmtMoneyCents(totalInCents)} />
        </div>

        <CashOutForm
          totalInCents={totalInCents}
          autoFocus
          onSubmit={(amount) => {
            cashOutPlayer(playerId, amount);
            onClose();
          }}
        />
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </ModalShell>
  );
}
