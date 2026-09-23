"use client";

import { create } from "zustand";

export type ConfirmRequest = {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Destructive actions get a red confirm button. */
  tone?: "default" | "danger";
  /** Acknowledge-only notice: a single OK button, no cancel. */
  notice?: boolean;
};

type Pending = ConfirmRequest & {
  id: number;
  resolve: (ok: boolean) => void;
};

/** Queue rendered by <ConfirmHost />; only the head is on screen. */
export const useConfirmQueue = create<{ queue: Pending[] }>(() => ({
  queue: [],
}));

let seq = 0;

/**
 * In-app replacement for `window.confirm`. Unlike the native dialog it
 * doesn't block the main thread, so the blind clock keeps ticking (and
 * its level-up sound still fires) while the prompt is open.
 */
export function confirmAction(request: ConfirmRequest): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmQueue.setState((s) => ({
      queue: [...s.queue, { ...request, id: ++seq, resolve }],
    }));
  });
}

/** In-app replacement for `window.alert`. */
export async function showNotice(title: string, message?: string) {
  await confirmAction({ title, message, notice: true, confirmLabel: "OK" });
}

export function settleConfirm(id: number, ok: boolean) {
  const { queue } = useConfirmQueue.getState();
  const item = queue.find((q) => q.id === id);
  if (!item) return;
  useConfirmQueue.setState({ queue: queue.filter((q) => q.id !== id) });
  item.resolve(ok);
}
