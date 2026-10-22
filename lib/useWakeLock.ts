"use client";

import { useEffect } from "react";

/**
 * Holds a screen wake lock while `active`, so a phone left on the table
 * doesn't auto-lock and send the page to the background. Browsers drop the
 * lock whenever the page is hidden, so it's requested again on return.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let requesting = false;
    let disposed = false;

    function acquire() {
      if (requesting || document.visibilityState !== "visible") return;
      if (lock && !lock.released) return;
      requesting = true;
      navigator.wakeLock.request("screen").then(
        (sentinel) => {
          requesting = false;
          if (disposed) void sentinel.release();
          else lock = sentinel;
        },
        // Refused (low battery, power saver): the screen may sleep as usual.
        () => {
          requesting = false;
        },
      );
    }

    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [active]);
}
