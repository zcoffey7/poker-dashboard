"use client";

import { useEffect, useSyncExternalStore } from "react";
import { upcomingChimes, type Chime, type ChimeKind } from "./chimes";
import { useTournament } from "./store";

type Note = {
  /** Seconds after the chime starts. */
  at: number;
  freq: number;
  ms: number;
  volume: number;
  wave: OscillatorType;
};

const NOTES: Record<ChimeKind, Note[]> = {
  levelUp: [
    { at: 0, freq: 660, ms: 220, volume: 0.95, wave: "triangle" },
    { at: 0.22, freq: 880, ms: 220, volume: 0.95, wave: "triangle" },
    { at: 0.44, freq: 1100, ms: 360, volume: 1, wave: "triangle" },
  ],
  // Attention-grabbing rising arpeggio: maxed-out volume with a bright
  // waveform so it cuts through conversation from across the room when
  // blinds are about to go up. Total duration ~1.6s.
  warning: [
    { at: 0, freq: 700, ms: 320, volume: 1, wave: "square" },
    { at: 0.32, freq: 700, ms: 320, volume: 1, wave: "square" },
    { at: 0.7, freq: 880, ms: 360, volume: 1, wave: "square" },
    { at: 1.08, freq: 1175, ms: 560, volume: 1, wave: "square" },
  ],
};

/** Upcoming chimes kept booked on the audio clock (about three levels). */
const LOOKAHEAD = 6;

/** Events browsers accept as the user gesture that lets audio start. */
const GESTURES = ["touchend", "click", "keydown"] as const;

type Booking = {
  /** Wall-clock start (epoch ms). */
  at: number;
  /** Audio-clock start (seconds). */
  when: number;
  bus: GainNode;
  sources: OscillatorNode[];
};

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };
type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
const bookings = new Map<string, Booking>();
let keepAlive: HTMLAudioElement | null = null;
let mounted = false;
let inGesture = false;
let suspendedByUs = false;
let stalled = false;
let lastStartAttempt = -Infinity;
let suspendTimer: ReturnType<typeof setTimeout> | undefined;

let blocked = false;
let blockedTimer: ReturnType<typeof setTimeout> | undefined;
const blockedListeners = new Set<() => void>();

function wanted(): boolean {
  const { clock, settings } = useTournament.getState();
  return mounted && settings.soundEnabled && clock.running;
}

function bookNote(
  ac: AudioContext,
  bus: AudioNode,
  note: Note,
  when: number,
): OscillatorNode[] {
  // Stack a fundamental with a brighter harmonic so the tone has body *and*
  // enough high-frequency cut-through to be heard across a room.
  const osc = ac.createOscillator();
  const harm = ac.createOscillator();
  const harmGain = ac.createGain();
  const gain = ac.createGain();
  osc.type = note.wave;
  osc.frequency.value = note.freq;
  harm.type = "square";
  harm.frequency.value = note.freq * 2;
  harmGain.gain.value = 0.25;
  osc.connect(gain);
  harm.connect(harmGain).connect(gain);
  gain.connect(bus);

  const start = when + note.at;
  const dur = note.ms / 1000;
  const attack = 0.01;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(note.volume, start + attack);
  gain.gain.setValueAtTime(note.volume, start + Math.max(attack, dur * 0.7));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  for (const source of [osc, harm]) {
    source.start(start);
    source.stop(start + dur + 0.02);
  }
  return [osc, harm];
}

function book(ac: AudioContext, chime: Chime): Booking {
  const when = ac.currentTime + Math.max(0, (chime.at - Date.now()) / 1000);
  const bus = ac.createGain();
  bus.connect(ac.destination);
  const sources = NOTES[chime.kind].flatMap((n) => bookNote(ac, bus, n, when));
  return { at: chime.at, when, bus, sources };
}

function cancel(booking: Booking) {
  booking.bus.disconnect();
  for (const source of booking.sources) source.stop();
}

/**
 * Books the first `LOOKAHEAD` of `chimes` and cancels anything else still in
 * the future. A chime that's already due plays out, so rolling the level (or
 * the clock stopping at the end of the structure) can't cut off the
 * level-up that announced it.
 */
function reconcile(ac: AudioContext, chimes: Chime[]) {
  const now = Date.now();
  const want = new Map(
    chimes.slice(0, LOOKAHEAD).map((c) => [`${c.kind}@${c.at}`, c]),
  );
  for (const [key, booking] of bookings) {
    if (booking.at <= now) {
      if (booking.when + 2 < ac.currentTime) bookings.delete(key);
    } else if (!want.has(key)) {
      cancel(booking);
      bookings.delete(key);
    }
  }
  for (const [key, chime] of want) {
    if (!bookings.has(key)) bookings.set(key, book(ac, chime));
  }
}

/**
 * Cancels every booking the audio clock hasn't reached. That clock stops
 * while a context is suspended or interrupted, or the page is frozen, but
 * the wall clock doesn't, so those chimes would sound late; the next
 * `reconcile` books them again against the wall clock.
 */
function dropPending(ac: AudioContext) {
  for (const [key, booking] of bookings) {
    if (booking.when > ac.currentTime) cancel(booking);
    bookings.delete(key);
  }
}

function createContext(): AudioContext | null {
  const Ctx =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctx) return null;
  // iOS treats Web Audio as ambient sound unless told otherwise: muted by the
  // ringer switch and suspended once the page is in the background.
  const nav = navigator as AudioSessionNavigator;
  if (nav.audioSession) nav.audioSession.type = "playback";
  const ac = new Ctx();
  ac.onstatechange = () => {
    if (ac !== ctx) return;
    if (ac.state === "running") {
      stalled = false;
      dropPending(ac);
    }
    sync();
  };
  return ac;
}

function dropContext() {
  if (!ctx) return;
  ctx.onstatechange = null;
  void ctx.close().catch(() => {});
  ctx = null;
  bookings.clear();
  stalled = false;
}

/**
 * The running context, or as close as the browser allows: audio may only
 * start inside a tap or key press, so outside one this can return a
 * suspended context (or none) and the next gesture finishes the job.
 */
function ensureRunning(): AudioContext | null {
  const settled = performance.now() - lastStartAttempt > 1000;
  // iOS can leave a context interrupted, or "running" on a frozen clock,
  // after the page was in the background, and resume() doesn't always bring
  // it back. A fresh context created inside a tap always starts.
  if (
    ctx &&
    inGesture &&
    settled &&
    (stalled || (ctx.state !== "running" && !suspendedByUs))
  ) {
    dropContext();
  }
  if (!ctx) {
    if (!inGesture && navigator.userActivation?.hasBeenActive === false) {
      return null;
    }
    ctx = createContext();
    if (!ctx) return null;
    lastStartAttempt = performance.now();
  }
  if (ctx.state !== "running") {
    suspendedByUs = false;
    lastStartAttempt = performance.now();
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Flags a context that reports "running" while its clock stands still. */
function checkForStall(ac: AudioContext) {
  const audioStart = ac.currentTime;
  const wallStart = performance.now();
  setTimeout(() => {
    if (ac !== ctx || ac.state !== "running") return;
    const elapsed = (performance.now() - wallStart) / 1000;
    stalled = ac.currentTime - audioStart < elapsed / 4;
    publish();
  }, 1000);
}

/** A mono 16-bit PCM WAV of digital silence. */
function silentWav(seconds: number): Blob {
  const rate = 8000;
  const bytes = seconds * rate * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const tag = (offset: number, id: string) => {
    for (let i = 0; i < 4; i++) view.setUint8(offset + i, id.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, bytes, true);
  return new Blob([view.buffer], { type: "audio/wav" });
}

/**
 * Phones suspend a hidden page unless it's playing media, and the booked
 * chimes go quiet with it. A looping silent track keeps the page "playing"
 * while the clock runs.
 */
function startKeepAlive() {
  if (!window.matchMedia("(any-pointer: coarse)").matches) return;
  if (!keepAlive) {
    // Chrome on Android only gives media of 5 s or more the media session
    // that keeps it playing in the background.
    keepAlive = new Audio(URL.createObjectURL(silentWav(6)));
    keepAlive.loop = true;
  }
  if (keepAlive.paused) void keepAlive.play().catch(() => {});
}

function sync() {
  if (wanted()) {
    clearTimeout(suspendTimer);
    const ac = ensureRunning();
    startKeepAlive();
    if (ac?.state === "running") {
      const { clock, blindStructure, settings } = useTournament.getState();
      reconcile(
        ac,
        upcomingChimes(clock, blindStructure, settings.warnSec, Date.now()),
      );
    }
  } else {
    if (ctx) reconcile(ctx, []);
    keepAlive?.pause();
    clearTimeout(suspendTimer);
    // Suspending lets iOS hand audio back to other apps while the clock is
    // stopped; the delay lets a chime that's already sounding finish.
    suspendTimer = setTimeout(() => {
      if (ctx?.state === "running" && !wanted()) {
        suspendedByUs = true;
        void ctx.suspend();
      }
    }, 2500);
  }
  publish();
}

function isBlocked(): boolean {
  return wanted() && (ctx?.state !== "running" || stalled);
}

function setBlocked(next: boolean) {
  if (next === blocked) return;
  blocked = next;
  for (const listener of blockedListeners) listener();
}

function publish() {
  if (!isBlocked()) {
    clearTimeout(blockedTimer);
    blockedTimer = undefined;
    setBlocked(false);
  } else if (!blocked && blockedTimer === undefined) {
    // A context started inside a tap reports "running" a beat later; don't
    // flash the prompt in between.
    blockedTimer = setTimeout(() => {
      blockedTimer = undefined;
      setBlocked(isBlocked());
    }, 1000);
  }
}

function onGesture() {
  // Audio may only start inside a gesture's handlers, and the clock can start
  // further along this same event (the Start button's onClick), so the flag
  // stays up until the event has finished dispatching.
  inGesture = true;
  setTimeout(() => {
    inGesture = false;
  }, 0);
  sync();
}

/** Handler for the "Enable sound" prompt; any tap on the page does the same. */
export const enableSound = onGesture;

/**
 * Plays the blind clock's warning and level-up chimes while the dashboard is
 * mounted. They're booked ahead on the audio clock instead of fired from the
 * 1 s tick, because phones throttle or freeze timers on a hidden page while
 * the audio clock keeps time for as long as the page may play sound.
 */
export function useClockSounds() {
  useEffect(() => {
    mounted = true;
    function onVisibility() {
      if (document.visibilityState === "visible" && ctx?.state === "running") {
        dropPending(ctx);
        checkForStall(ctx);
      }
      sync();
    }
    const unsubscribe = useTournament.subscribe((s, prev) => {
      if (
        s.clock.running !== prev.clock.running ||
        s.clock.currentLevel !== prev.clock.currentLevel ||
        s.clock.levelStartedAt !== prev.clock.levelStartedAt ||
        s.blindStructure !== prev.blindStructure ||
        s.settings.soundEnabled !== prev.settings.soundEnabled ||
        s.settings.warnSec !== prev.settings.warnSec
      ) {
        sync();
      }
    });
    for (const type of GESTURES) window.addEventListener(type, onGesture, true);
    document.addEventListener("visibilitychange", onVisibility);
    sync();
    return () => {
      mounted = false;
      unsubscribe();
      for (const type of GESTURES) {
        window.removeEventListener(type, onGesture, true);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      sync();
    };
  }, []);
}

/** True while the clock wants sound but the browser is holding it for a tap. */
export function useSoundBlocked(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      blockedListeners.add(onChange);
      return () => blockedListeners.delete(onChange);
    },
    () => blocked,
    () => false,
  );
}
