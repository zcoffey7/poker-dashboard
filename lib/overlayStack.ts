"use client";

type OverlayEntry = {
  id: number;
  onEscape?: () => void;
};

let stack: OverlayEntry[] = [];
let nextId = 0;
let savedBodyOverflow = "";

export type OverlayHandle = {
  /** Remove this layer (call on unmount). */
  pop: () => void;
  /** True while no other overlay has been opened on top of this one. */
  isTop: () => boolean;
};

/**
 * Push an overlay layer (modal, drawer, …). While any layer is open the page
 * behind it is scroll-locked, so dragging on a phone moves the sheet's own
 * content rather than the dashboard underneath.
 */
export function pushOverlay(onEscape?: () => void): OverlayHandle {
  const id = ++nextId;
  if (stack.length === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  stack.push({ id, onEscape });
  return {
    pop: () => {
      const before = stack.length;
      stack = stack.filter((e) => e.id !== id);
      if (before > 0 && stack.length === 0) {
        document.body.style.overflow = savedBodyOverflow;
      }
    },
    isTop: () => stack[stack.length - 1]?.id === id,
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
