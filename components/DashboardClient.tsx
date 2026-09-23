"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useClockTick } from "@/lib/clock";
import { overlayDepth } from "@/lib/overlayStack";
import { useTournament } from "@/lib/store";
import { useHasHydrated } from "@/lib/useHasHydrated";
import ModalShell, { ModalHeader } from "./ModalShell";
import BlindClock from "./BlindClock";
import StatsBar from "./StatsBar";
import ChipLegend from "./ChipLegend";
import TablesView from "./TablesView";
import PlayerRoster from "./PlayerRoster";
import PayoutsPanel from "./PayoutsPanel";
import GameRecap from "./GameRecap";
import FinishDialog from "./FinishDialog";
import RebalancePopup from "./RebalancePopup";
import { IconFlag, IconLayoutGrid, IconUsers } from "./icons";
import styles from "./DashboardClient.module.css";

type Panel = "tables" | "players";

export default function DashboardClient() {
  // The whole dashboard reads persisted state; render a neutral skeleton
  // until it's loaded so the static HTML never shows a default game.
  const hydrated = useHasHydrated(useTournament);
  if (!hydrated) return <DashboardSkeleton />;
  return <Dashboard />;
}

function Dashboard() {
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
  // Stable so the drawer's overlay registration doesn't churn on re-render
  // (which would lift it above a dialog opened from inside it).
  const closePanel = useCallback(() => setOpenPanel(null), []);

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
      // Overlays (side panel, modals) register on the stack and handle
      // Escape themselves — only the topmost layer closes.
      if (overlayDepth() > 0) return;
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
  }, [toggleClock, nextLevel, prevLevel, hasPendingRebalance]);

  return (
    <div
      className={`${styles.layout} flex flex-col gap-3 p-3 pb-action-bar md:p-4 md:pb-4 md:h-full md:min-h-0 md:overflow-hidden`}
    >
      <div className={`${styles.clock} order-1 md:min-h-0`}>
        <BlindClock />
      </div>
      <div className={`${styles.stats} order-2`}>
        <StatsBar />
      </div>
      <div className={`${styles.payouts} order-3 md:min-h-0`}>
        <PayoutsPanel />
      </div>
      <div className={`${styles.chips} order-4 min-w-0 md:min-h-0`}>
        <ChipLegend />
      </div>

      <div className={`${styles.actions} action-bar`}>
        <div className="grid grid-cols-3 gap-2 md:flex md:justify-center">
          <PanelButton
            label="Players"
            shortcut="P"
            icon={<IconUsers />}
            active={openPanel === "players"}
            onClick={() =>
              setOpenPanel((p) => (p === "players" ? null : "players"))
            }
          />
          <PanelButton
            label="Tables"
            shortcut="T"
            icon={<IconLayoutGrid />}
            active={openPanel === "tables"}
            onClick={() =>
              setOpenPanel((p) => (p === "tables" ? null : "tables"))
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
            <IconFlag />
            <span className="md:hidden">Finish</span>
            <span className="hidden md:inline">Finish / Chop</span>
          </button>
        </div>
      </div>

      {/* Dialogs portal to <body>, above the recap, so the dashboard's own
          overlays step aside once the game is over. */}
      {openPanel && !finishedAt && (
        <SidePanel
          title={openPanel === "tables" ? "Tables" : "Players"}
          onClose={closePanel}
        >
          {openPanel === "tables" && <TablesView />}
          {openPanel === "players" && <PlayerRoster />}
        </SidePanel>
      )}

      {finishOpen && <FinishDialog onClose={() => setFinishOpen(false)} />}

      {finishedAt ? <GameRecap /> : <RebalancePopup />}
    </div>
  );
}

function PanelButton({
  label,
  shortcut,
  icon,
  active,
  onClick,
}: {
  label: string;
  shortcut: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`btn ${active ? "btn-primary" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      {label}
      <span className="kbd hidden lg:inline-flex ml-0.5" aria-hidden="true">
        {shortcut}
      </span>
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
  const titleId = useId();
  return (
    <ModalShell
      variant="drawer"
      onClose={onClose}
      labelledBy={titleId}
      cardClassName="flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]"
    >
      <ModalHeader
        titleId={titleId}
        title={title}
        onClose={onClose}
        closeLabel={`Close ${title}`}
      />
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] scrollbar-thin">
        {children}
      </div>
    </ModalShell>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 p-3 md:p-4"
      aria-busy="true"
      aria-label="Loading tournament"
    >
      <div className="card h-[22rem] md:h-[28rem] animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card h-[4.5rem] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
