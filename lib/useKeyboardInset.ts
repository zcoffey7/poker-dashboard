"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", onChange);
  vv.addEventListener("scroll", onChange);
  return () => {
    vv.removeEventListener("resize", onChange);
    vv.removeEventListener("scroll", onChange);
  };
}

function getInset(): number {
  const vv = window.visualViewport;
  if (!vv || vv.scale > 1.01) return 0;
  const covered = window.innerHeight - vv.height - vv.offsetTop;
  // Small differences come from collapsing browser toolbars, not a keyboard.
  return covered > 120 ? Math.round(covered) : 0;
}

/**
 * Pixels of the layout viewport hidden behind the on-screen keyboard (0 when
 * it's closed). iOS Safari overlays the keyboard instead of resizing the page,
 * so a bottom sheet with a focused field would otherwise hide its own
 * confirm button behind the keys.
 */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, getInset, () => 0);
}
