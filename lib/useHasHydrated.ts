"use client";

import { useSyncExternalStore } from "react";

type PersistStore = {
  persist: {
    onFinishHydration: (cb: () => void) => () => void;
    hasHydrated: () => boolean;
  };
};

/**
 * True once the given zustand `persist` store has rehydrated from
 * localStorage on the client.
 *
 * The server snapshot is always `false`, so SSR output and the first client
 * paint agree (no hydration mismatch), and the persisted values swap in as
 * soon as rehydration completes. Unlike the `useState` + `useEffect` mounted
 * flag, this never sets state inside an effect (react-hooks/set-state-in-
 * effect) and flips at hydration time rather than mount time.
 */
export function useHasHydrated(store: PersistStore): boolean {
  return useSyncExternalStore(
    (onChange) => store.persist.onFinishHydration(onChange),
    () => store.persist.hasHydrated(),
    () => false,
  );
}
