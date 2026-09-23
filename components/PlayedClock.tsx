"use client";

import { useSyncExternalStore } from "react";
import {
  fmtPlayedClock,
  playedSec,
  type PlayInterval,
} from "@/lib/playTime";
import { IconClock } from "./icons";

let currentNow = Date.now();
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function emit() {
  currentNow = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  currentNow = Date.now();
  listeners.add(onStoreChange);
  if (intervalId == null) {
    intervalId = setInterval(emit, 1000);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getNow() {
  return currentNow;
}

type Props = {
  name: string;
  intervals: PlayInterval[] | undefined;
};

export default function PlayedClock({ name, intervals }: Props) {
  const now = useSyncExternalStore(subscribe, getNow, getNow);
  if (intervals == null || intervals.length === 0) return null;
  const sec = playedSec(intervals, now);
  const label = fmtPlayedClock(sec);
  return (
    <span
      className="inline-flex items-center gap-1 text-xs tabular-nums text-subtle shrink-0"
      title="Time played"
      aria-label={`${name} played ${label}`}
      data-played-seconds={String(sec)}
    >
      <IconClock size="0.95em" />
      {label}
    </span>
  );
}

/**
 * Name + clock as one unit so action buttons wrap instead of crushing the
 * name down to a single truncated letter.
 */
export function PlayerNameClock({
  name,
  intervals,
  onNameClick,
  nameAriaLabel,
  struck,
  nameClassName = "",
}: {
  name: string;
  intervals: PlayInterval[] | undefined;
  onNameClick?: () => void;
  nameAriaLabel?: string;
  struck?: boolean;
  nameClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-[9.5rem] flex-1">
      <button
        type="button"
        className={`text-left font-medium whitespace-nowrap cursor-pointer rounded hover:text-primary transition-colors ${
          struck ? "line-through decoration-loss/60" : ""
        } ${nameClassName}`}
        onClick={onNameClick}
        aria-label={nameAriaLabel}
        title="View details"
      >
        {name}
      </button>
      <PlayedClock name={name} intervals={intervals} />
    </div>
  );
}
