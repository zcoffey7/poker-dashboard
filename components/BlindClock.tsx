"use client";

import { useTournament } from "@/lib/store";
import { fmtTime } from "@/lib/clock";
import { confirmAction } from "@/lib/confirm";
import {
  IconCoffee,
  IconPause,
  IconPlay,
  IconRotateCcw,
  IconSkipBack,
  IconSkipForward,
} from "./icons";

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
      <div className="card p-6 text-center text-muted">
        No blind levels configured.
      </div>
    );
  }

  const elapsedPct =
    current.durationSec > 0
      ? Math.min(100, Math.max(0, (1 - clock.remainingSec / current.durationSec) * 100))
      : 0;
  const barColor = isWarning
    ? "bg-warn"
    : current.isBreak
      ? "bg-gold"
      : "bg-primary";

  async function handleReset() {
    const ok = await confirmAction({
      title: "Reset the level timer?",
      message: "The current level starts over at its full duration.",
      confirmLabel: "Reset timer",
    });
    if (ok) resetLevel();
  }

  return (
    <section
      aria-label="Blind clock"
      className={`card relative overflow-hidden p-4 sm:p-5 flex flex-col gap-3 md:h-full md:min-h-0 ${
        current.isBreak ? "border-gold/40" : ""
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-2/3 w-3/4 -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
        style={{
          background: current.isBreak
            ? "color-mix(in oklab, var(--gold) 12%, transparent)"
            : "var(--glow-1)",
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {current.isBreak ? (
            <span className="chip chip-gold h-7 px-3 text-xs">
              <IconCoffee />
              Break
            </span>
          ) : (
            <span className="chip chip-primary h-7 px-3 text-xs">
              Level {current.level}
            </span>
          )}
          <span className="text-xs text-muted tabular-nums">
            of {structure.length}
          </span>
        </div>
        {clock.running ? (
          <span className="chip chip-primary">
            <span className="live-dot" aria-hidden="true" />
            Running
          </span>
        ) : (
          <span className="chip">Paused</span>
        )}
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center text-center py-1">
        <div
          className={`font-semibold tabular-nums tracking-[-0.04em] leading-[0.95] text-[clamp(4.5rem,min(19vh,25vw),13rem)] ${
            isWarning ? "warn-pulse" : ""
          }`}
        >
          {fmtTime(clock.remainingSec)}
        </div>
        {current.isBreak ? (
          <div className="mt-4 text-gold text-[clamp(1rem,2.6vh,1.5rem)] font-medium">
            Take a breather — play resumes when the timer ends.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-baseline justify-center gap-x-10 gap-y-1">
            <Metric
              label="Blinds"
              value={`${fmtChips(current.smallBlind)} / ${fmtChips(current.bigBlind)}`}
            />
            {current.ante > 0 && (
              <Metric label="Ante" value={fmtChips(current.ante)} />
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          className="h-1.5 rounded-full bg-surface-3 overflow-hidden"
          role="progressbar"
          aria-label="Level progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(elapsedPct)}
        >
          <div
            key={clock.currentLevel}
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${barColor}`}
            style={{ width: `${elapsedPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[clamp(0.75rem,1.7vh,0.9375rem)] text-muted">
          <span className="truncate">
            Up next{" "}
            <span className="text-text font-medium">
              {next
                ? next.isBreak
                  ? `Break · ${Math.round(next.durationSec / 60)} min`
                  : `${fmtChips(next.smallBlind)} / ${fmtChips(next.bigBlind)}${
                      next.ante > 0 ? ` · ${fmtChips(next.ante)} ante` : ""
                    }`
                : "End of structure"}
            </span>
          </span>
          <span className="shrink-0 tabular-nums">
            {Math.round(current.durationSec / 60)} min level
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-center gap-2 sm:gap-3">
        <button
          className="btn btn-lg btn-icon"
          onClick={() => prevLevel()}
          title="Previous level"
          aria-label="Previous level"
        >
          <IconSkipBack />
        </button>
        <button
          className="btn btn-primary btn-lg flex-1 max-w-[13rem] sm:flex-none sm:min-w-[9.5rem]"
          onClick={() => toggleClock()}
        >
          {clock.running ? <IconPause /> : <IconPlay />}
          {clock.running ? "Pause" : "Start"}
        </button>
        <button
          className="btn btn-lg btn-icon"
          onClick={() => nextLevel()}
          title="Next level"
          aria-label="Next level"
        >
          <IconSkipForward />
        </button>
        <button
          className="btn btn-ghost btn-lg btn-icon"
          onClick={handleReset}
          title="Reset level timer"
          aria-label="Reset current level timer"
        >
          <IconRotateCcw />
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="label text-[clamp(0.6875rem,1.5vh,0.875rem)]">{label}</span>
      <span className="text-[clamp(1.375rem,min(4.6vh,6.5vw),3rem)] font-semibold tabular-nums tracking-tight">
        {value}
      </span>
    </div>
  );
}
