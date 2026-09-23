"use client";

import { useId, useMemo } from "react";
import ModalShell, { ModalHeader } from "../ModalShell";
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
      cardClassName="w-full sm:max-w-sm flex flex-col overflow-hidden"
    >
      <ModalHeader
        titleId={titleId}
        eyebrow="Cash out"
        title={player.name}
        onClose={onClose}
      />

      <div className="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
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
    </ModalShell>
  );
}
