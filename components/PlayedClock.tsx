"use client";

import { useSyncExternalStore } from "react";
import {
  fmtPlayedClock,
  playedSec,
  type PlayInterval,
} from "@/lib/playTime";

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
      className="inline-flex items-center gap-0.5 font-mono text-[11px] tabular-nums text-[var(--text-muted)] shrink-0"
      title="Time played"
      aria-label={`${name} played ${label}`}
      data-played-seconds={String(sec)}
    >
      <ClockGlyph />
      {label}
    </span>
  );
}

function ClockGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5v4l2.5 1.5" />
    </svg>
  );
}
