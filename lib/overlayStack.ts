"use client";

type OverlayEntry = {
  id: number;
  onEscape?: () => void;
};

let stack: OverlayEntry[] = [];
let nextId = 0;

/** Push an overlay layer. Returns a pop function for cleanup on unmount. */
export function pushOverlay(onEscape?: () => void): () => void {
  const id = ++nextId;
  stack.push({ id, onEscape });
  return () => {
    stack = stack.filter((e) => e.id !== id);
  };
}

/** How many overlays are currently registered (modals, side panels, …). */
export function overlayDepth(): number {
  return stack.length;
}

/**
 * Invoke the topmost overlay's Escape handler. Returns true when handled.
 * Call from capture-phase listeners so nested overlays win over parents.
 */
export function handleOverlayEscape(e: KeyboardEvent): boolean {
  if (e.key !== "Escape") return false;
  const top = stack[stack.length - 1];
  if (!top?.onEscape) return false;
  e.preventDefault();
  e.stopPropagation();
  top.onEscape();
  return true;
}
