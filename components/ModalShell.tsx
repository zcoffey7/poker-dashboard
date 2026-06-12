"use client";

import { useEffect, useId, useRef } from "react";
import { handleOverlayEscape, pushOverlay } from "@/lib/overlayStack";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 * dismissal (topmost layer wins), focus trap, and `role="dialog"` semantics.
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
  const cardRef = useRef<HTMLDivElement>(null);
  const fallbackTitleId = useId();
  const titleId = labelledBy ?? (label ? fallbackTitleId : undefined);

  useEffect(() => {
    const pop = pushOverlay(onClose);
    const previous = document.activeElement as HTMLElement | null;

    const card = cardRef.current;
    if (card) {
      const first = card.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? card).focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (handleOverlayEscape(e)) return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const nodes = Array.from(
        cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      pop();
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center ${
        centered ? "items-center p-4" : "items-end sm:items-center p-0 sm:p-4"
      } ${overlayClassName ?? "bg-black/60 backdrop-blur-sm"}`}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className={`card outline-none ${cardClassName}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
      >
        {label && !labelledBy && (
          <span id={fallbackTitleId} className="sr-only">
            {label}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
