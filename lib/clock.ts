"use client";

import { useEffect } from "react";
import { useTournament } from "./store";

let audioCtx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    type WindowWithWebkit = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const w = window as WindowWithWebkit;
    const Ctx = window.AudioContext || w.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function playBeep(freq = 880, durationMs = 200, volume = 0.15) {
  const ctx = ensureCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

export function playLevelUp() {
  playBeep(660, 180);
  setTimeout(() => playBeep(880, 180), 200);
  setTimeout(() => playBeep(1100, 300), 400);
}

export function playWarning() {
  playBeep(440, 120);
  setTimeout(() => playBeep(440, 120), 180);
}

export function useClockTick() {
  useEffect(() => {
    const id = setInterval(() => {
      useTournament.getState().tick();
    }, 1000);
    return () => clearInterval(id);
  }, []);
}

export function fmtTime(totalSec: number): string {
  if (totalSec < 0) totalSec = 0;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
