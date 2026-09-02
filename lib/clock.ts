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

type Waveform = OscillatorType;

export function playBeep(
  freq = 880,
  durationMs = 200,
  volume = 0.9,
  waveform: Waveform = "sine",
) {
  const ctx = ensureCtx();
  if (!ctx) return;
  // Stack a fundamental sine with a brighter harmonic so the tone has body
  // *and* enough high-frequency cut-through to be heard across a room.
  const osc = ctx.createOscillator();
  const oscHarm = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = waveform;
  osc.frequency.value = freq;
  oscHarm.type = "square";
  oscHarm.frequency.value = freq * 2;
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.25;
  osc.connect(gain);
  oscHarm.connect(harmGain).connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const attack = 0.01;
  const dur = durationMs / 1000;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + attack);
  gain.gain.setValueAtTime(volume, now + Math.max(attack, dur * 0.7));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  oscHarm.start(now);
  osc.stop(now + dur + 0.02);
  oscHarm.stop(now + dur + 0.02);
}

export function playLevelUp() {
  playBeep(660, 220, 0.95, "triangle");
  setTimeout(() => playBeep(880, 220, 0.95, "triangle"), 220);
  setTimeout(() => playBeep(1100, 360, 1, "triangle"), 440);
}

export function playWarning() {
  // Attention-grabbing rising arpeggio: maxed-out volume with a bright
  // waveform so it cuts through conversation from across the room when
  // blinds are about to go up. Total duration ~1.6s.
  playBeep(700, 320, 1, "square");
  setTimeout(() => playBeep(700, 320, 1, "square"), 320);
  setTimeout(() => playBeep(880, 360, 1, "square"), 700);
  setTimeout(() => playBeep(1175, 560, 1, "square"), 1080);
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

/**
 * Compact duration formatter.
 * < 1 hour  -> "MM:SS"  (e.g. "45:30")
 * >= 1 hour -> "1hr 10m" (never "70:00")
 */
export function fmtDuration(totalSec: number): string {
  if (totalSec < 0) totalSec = 0;
  if (totalSec < 3600) return fmtTime(totalSec);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return m > 0 ? `${h}hr ${m}m` : `${h}hr`;
}
