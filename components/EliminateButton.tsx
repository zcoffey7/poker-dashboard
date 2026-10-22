"use client";

import { useId, useState } from "react";
import { useTournament } from "@/lib/store";
import { confirmAction } from "@/lib/confirm";
import type { Player } from "@/lib/types";
import ModalShell, { ModalFooter } from "./ModalShell";
import { BountyRow } from "./Bounties";
import { IconAlert } from "./icons";

const ELIMINATE_MESSAGE = "They'll be assigned the next finish place.";

/**
 * The "Out" button in the roster and tables. With bounties on, the
 * confirmation also asks how many bounties the player won.
 */
export default function EliminateButton({ player }: { player: Player }) {
  const bountiesEnabled = useTournament((s) => s.settings.bountiesEnabled);
  const eliminatePlayer = useTournament((s) => s.eliminatePlayer);
  const [asking, setAsking] = useState(false);

  async function handleClick() {
    if (bountiesEnabled) {
      setAsking(true);
      return;
    }
    const ok = await confirmAction({
      title: `Eliminate ${player.name}?`,
      message: ELIMINATE_MESSAGE,
      confirmLabel: "Eliminate",
      tone: "danger",
    });
    if (ok) eliminatePlayer(player.id);
  }

  return (
    <>
      <button
        className="btn btn-danger btn-xs"
        onClick={handleClick}
        aria-label={`Eliminate ${player.name}`}
      >
        Out
      </button>
      {asking && (
        <EliminateDialog player={player} onClose={() => setAsking(false)} />
      )}
    </>
  );
}

function EliminateDialog({
  player,
  onClose,
}: {
  player: Player;
  onClose: () => void;
}) {
  const players = useTournament((s) => s.players);
  const eliminatePlayer = useTournament((s) => s.eliminatePlayer);
  const setBounties = useTournament((s) => s.setBounties);
  const titleId = useId();
  const descId = useId();

  // Knocking out the second-to-last player ends the tournament, and the
  // winner never gets an elimination of their own to record bounties on.
  const remaining = players.filter((p) => !p.eliminated && p.id !== player.id);
  const winner = remaining.length === 1 ? remaining[0] : undefined;

  const [count, setCount] = useState(player.bounties ?? 0);
  const [winnerCount, setWinnerCount] = useState(winner?.bounties ?? 0);

  function confirm() {
    setBounties(player.id, count);
    if (winner) setBounties(winner.id, winnerCount);
    eliminatePlayer(player.id);
    onClose();
  }

  return (
    <ModalShell
      role="alertdialog"
      variant="center"
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descId}
      cardClassName="w-full max-w-md overflow-hidden"
    >
      <div className="flex gap-4 px-5 pt-5 pb-4">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-loss/12 text-loss">
          <IconAlert />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            Eliminate {player.name}?
          </h2>
          <p id={descId} className="mt-1 text-sm text-muted leading-relaxed">
            {ELIMINATE_MESSAGE}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <BountyRow
              label={player.name}
              hint="Bounties won"
              playerName={player.name}
              value={count}
              onChange={setCount}
            />
            {winner && (
              <BountyRow
                label={winner.name}
                hint="Winner"
                playerName={winner.name}
                value={winnerCount}
                onChange={setWinnerCount}
              />
            )}
          </div>
        </div>
      </div>
      <ModalFooter>
        <button
          type="button"
          className="btn flex-1 sm:flex-none"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger-solid flex-1 sm:flex-none"
          onClick={confirm}
        >
          Eliminate
        </button>
      </ModalFooter>
    </ModalShell>
  );
}
