"use client";

import { useTournament } from "@/lib/store";
import { fmtTime } from "@/lib/clock";

function fmtChips(n: number): string {
  return n.toLocaleString();
}

export default function BlindClock() {
  const clock = useTournament((s) => s.clock);
  const structure = useTournament((s) => s.blindStructure);
  const settings = useTournament((s) => s.settings);
  const toggleClock = useTournament((s) => s.toggleClock);
  const prevLevel = useTournament((s) => s.prevLevel);
  const nextLevel = useTournament((s) => s.nextLevel);
  const resetLevel = useTournament((s) => s.resetLevel);

  const current = structure[clock.currentLevel];
  const next = structure[clock.currentLevel + 1];
  const isWarning =
    clock.running &&
    clock.remainingSec <= settings.warnSec &&
    clock.remainingSec > 0;

  if (!current) {
    return (
      <div className="card p-6 text-center text-[var(--text-muted)]">
        No blind levels configured.
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-2 sm:h-full sm:min-h-0 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="label">
            {current.isBreak ? "Break" : `Level ${current.level}`}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {structure.length} levels total
          </div>
        </div>
        <div className="flex items-center gap-2">
          {current.isBreak && <span className="chip chip-amber">BREAK</span>}
          {clock.running ? (
            <span className="chip chip-green">RUNNING</span>
          ) : (
            <span className="chip">PAUSED</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center py-2">
        <div
          className={`text-[clamp(3.5rem,min(14vh,22vw),10rem)] leading-[0.9] font-mono font-bold tracking-tight ${
            isWarning ? "warn-pulse" : ""
          }`}
        >
          {fmtTime(clock.remainingSec)}
        </div>
        {!current.isBreak && (
          <div className="mt-3 w-full flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-8 font-semibold px-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline items-center sm:gap-2 min-w-0 w-full sm:w-auto">
              <span className="text-[var(--text-muted)] text-[11px] sm:text-sm uppercase tracking-wider">
                Blinds
              </span>
              <span className="text-[clamp(1rem,7vw,1.75rem)] tabular-nums leading-tight break-all text-center">
                {fmtChips(current.smallBlind)} / {fmtChips(current.bigBlind)}
              </span>
            </div>
            {current.ante > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-baseline items-center sm:gap-2 min-w-0 w-full sm:w-auto">
                <span className="text-[var(--text-muted)] text-[11px] sm:text-sm uppercase tracking-wider">
                  Ante
                </span>
                <span className="text-[clamp(1rem,7vw,1.75rem)] tabular-nums leading-tight break-all text-center">
                  {fmtChips(current.ante)}
                </span>
              </div>
            )}
          </div>
        )}
        {next && (
          <div className="mt-3 w-full text-[clamp(0.75rem,3vw,0.95rem)] text-[var(--text-muted)] text-center px-2 break-words">
            Next:{" "}
            {next.isBreak
              ? `Break (${Math.round(next.durationSec / 60)} min)`
              : `${fmtChips(next.smallBlind)} / ${fmtChips(next.bigBlind)}${
                  next.ante > 0 ? ` + ${fmtChips(next.ante)} ante` : ""
                }`}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          className="btn"
          onClick={() => prevLevel()}
          title="Previous level"
        >
          « Prev
        </button>
        <button
          className="btn btn-primary min-w-[120px]"
          onClick={() => toggleClock()}
        >
          {clock.running ? "Pause" : "Start"}
        </button>
        <button
          className="btn"
          onClick={() => nextLevel()}
          title="Next level"
        >
          Next »
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (confirm("Reset the current level timer to full duration?"))
              resetLevel();
          }}
          aria-label="Reset current level timer"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
