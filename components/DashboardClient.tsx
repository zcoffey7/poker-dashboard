"use client";

import { useEffect, useState } from "react";
import { useClockTick } from "@/lib/clock";
import { useTournament } from "@/lib/store";
import BlindClock from "./BlindClock";
import StatsBar from "./StatsBar";
import ChipLegend from "./ChipLegend";
import TablesView from "./TablesView";
import PlayerRoster from "./PlayerRoster";
import PayoutsPanel from "./PayoutsPanel";
import GameRecap from "./GameRecap";
import FinishDialog from "./FinishDialog";
import RebalancePopup from "./RebalancePopup";

type Panel = "tables" | "players";

export default function DashboardClient() {
  useClockTick();
  const toggleClock = useTournament((s) => s.toggleClock);
  const nextLevel = useTournament((s) => s.nextLevel);
  const prevLevel = useTournament((s) => s.prevLevel);
  const finishedAt = useTournament((s) => s.finishedAt);
  const activeCount = useTournament(
    (s) => s.players.filter((p) => !p.eliminated).length,
  );
  const hasPlayers = useTournament((s) => s.players.length > 0);
  const hasPendingRebalance = useTournament(
    (s) => (s.pendingRebalanceMoves?.length ?? 0) > 0,
  );

  const [openPanel, setOpenPanel] = useState<Panel | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (hasPendingRebalance) return;
      if (e.key === "Escape") {
        if (finishOpen) {
          setFinishOpen(false);
          return;
        }
        if (openPanel) {
          setOpenPanel(null);
          return;
        }
      }
      if (finishOpen) return;
      if (openPanel) return;
      if (e.code === "Space") {
        e.preventDefault();
        toggleClock();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextLevel();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevLevel();
      } else if (e.key.toLowerCase() === "t") {
        setOpenPanel((p) => (p === "tables" ? null : "tables"));
      } else if (e.key.toLowerCase() === "p") {
        setOpenPanel((p) => (p === "players" ? null : "players"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    toggleClock,
    nextLevel,
    prevLevel,
    openPanel,
    finishOpen,
    hasPendingRebalance,
  ]);

  return (
    <div className="flex flex-col gap-3 p-3 md:p-4 min-h-[100dvh] md:h-full md:min-h-0 md:overflow-hidden">
      <StatsBar />

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <PanelButton
          label="Tables"
          active={openPanel === "tables"}
          onClick={() =>
            setOpenPanel((p) => (p === "tables" ? null : "tables"))
          }
        />
        <PanelButton
          label="Players"
          active={openPanel === "players"}
          onClick={() =>
            setOpenPanel((p) => (p === "players" ? null : "players"))
          }
        />
        <button
          className="btn"
          onClick={() => setFinishOpen(true)}
          disabled={!hasPlayers || activeCount === 0}
          title={
            !hasPlayers
              ? "Add players first"
              : activeCount === 0
                ? "No active players"
                : "Finish or chop the tournament"
          }
        >
          Finish / Chop
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="md:col-span-1 min-w-0">
          <ChipLegend />
        </div>
        <div className="md:col-span-4 flex flex-col gap-3 md:min-h-0 min-w-0">
          <div className="md:flex-[2] md:min-h-0">
            <BlindClock />
          </div>
          <div className="md:flex-1 md:min-h-0">
            <PayoutsPanel />
          </div>
        </div>
      </div>

      {openPanel && (
        <SidePanel
          title={openPanel === "tables" ? "Tables" : "Players"}
          onClose={() => setOpenPanel(null)}
        >
          {openPanel === "tables" && <TablesView />}
          {openPanel === "players" && <PlayerRoster />}
        </SidePanel>
      )}

      {finishOpen && <FinishDialog onClose={() => setFinishOpen(false)} />}

      {finishedAt && <GameRecap />}

      <RebalancePopup />
    </div>
  );
}

function PanelButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`btn ${active ? "btn-primary" : ""}`}
      onClick={onClick}
    >
      {active ? `Close ${label}` : label}
    </button>
  );
}

function SidePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-[100dvh] w-full max-w-2xl bg-[var(--bg)] shadow-2xl flex flex-col overflow-hidden animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div className="label">{title}</div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
