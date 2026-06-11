"use client";

import { useEffect } from "react";

type Props = {
  /**
   * Called when the user dismisses via backdrop click or Escape. Omit to
   * make the modal blocking (e.g. RebalancePopup must be acknowledged).
   * Consumers with unsaved work can pass a guarded close handler here.
   */
  onClose?: () => void;
  /** id of the visible element that labels the dialog (preferred). */
  labelledBy?: string;
  /** Fallback accessible name when there's no visible title element. */
  label?: string;
  /** Center the card on all viewports instead of bottom-sheet on mobile. */
  centered?: boolean;
  /** Classes for the card element (width caps, padding, overflow, …). */
  cardClassName: string;
  /** Overrides the default backdrop dim/blur styling. */
  overlayClassName?: string;
  children: React.ReactNode;
};

/**
 * Shared overlay + dialog chrome: fixed backdrop, click-outside and Escape
 * dismissal, and `role="dialog"` semantics. This is the single place to
 * grow focus-trap and Escape-stacking behavior (#26, #27).
 */
export default function ModalShell({
  onClose,
  labelledBy,
  label,
  centered = false,
  cardClassName,
  overlayClassName,
  children,
}: Props) {
  useEffect(() => {
    if (!onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${
        centered ? "items-center p-4" : "items-end sm:items-center p-0 sm:p-4"
      } ${overlayClassName ?? "bg-black/60 backdrop-blur-sm"}`}
      onClick={onClose}
    >
      <div
        className={`card ${cardClassName}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}
