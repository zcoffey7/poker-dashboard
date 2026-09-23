"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { handleOverlayEscape, pushOverlay } from "@/lib/overlayStack";
import { useKeyboardInset } from "@/lib/useKeyboardInset";
import { IconX } from "./icons";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Variant = "sheet" | "center" | "drawer";

const OVERLAY_LAYOUT: Record<Variant, string> = {
  // Bottom sheet on phones, centered card from `sm` up.
  sheet: "items-end sm:items-center justify-center p-0 sm:p-4",
  center: "items-center justify-center p-4",
  drawer: "items-stretch justify-end",
};

const CARD_LAYOUT: Record<Variant, string> = {
  sheet:
    "card rounded-b-none rounded-t-[22px] sm:rounded-[16px] shadow-2xl animate-pop-in",
  center: "card shadow-2xl animate-pop-in",
  drawer:
    "h-[100dvh] w-full max-w-2xl bg-bg sm:border-l border-border shadow-2xl animate-slide-in",
};

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
  /** id of the element describing the dialog (confirm messages). */
  describedBy?: string;
  /** Layout: bottom sheet on mobile (default), always centered, or a right-hand drawer. */
  variant?: Variant;
  role?: "dialog" | "alertdialog";
  /** Classes for the card element (width caps, padding, overflow, …). */
  cardClassName: string;
  children: React.ReactNode;
};

/**
 * Shared overlay + dialog chrome: fixed backdrop, click-outside and Escape
 * dismissal (topmost layer wins), focus trap, and `role="dialog"` semantics.
 *
 * Rendered into <body> through a portal: a dialog opened from inside a
 * blurred sticky bar would otherwise be positioned against that bar, since
 * `backdrop-filter` makes an element the containing block for fixed children.
 */
export default function ModalShell({
  onClose,
  labelledBy,
  label,
  describedBy,
  variant: layout = "sheet",
  role = "dialog",
  cardClassName,
  children,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const fallbackTitleId = useId();
  const titleId = labelledBy ?? (label ? fallbackTitleId : undefined);
  const keyboard = useKeyboardInset();
  // Ride above the on-screen keyboard instead of hiding the actions behind it.
  const lift = layout === "sheet" && keyboard > 0;

  // Mount-scoped: take focus once when the dialog opens, hand it back once
  // when it closes. This deliberately does not depend on `onClose` — a parent
  // that passes an inline callback, or swaps it out to block dismissal mid-
  // action, would otherwise yank the caret back to the first field on every
  // re-render.
  //
  // Text fields only get initial focus when marked `data-autofocus`: on a
  // phone, focusing one pops the keyboard over the sheet the moment it opens.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    if (card) {
      const preferred = card.querySelector<HTMLElement>("[data-autofocus]");
      const firstControl = Array.from(
        card.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).find((el) => !el.matches("input, textarea, select"));
      (preferred ?? firstControl ?? card).focus();
    }
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const layer = pushOverlay(onClose);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (handleOverlayEscape(e)) return;
      }
      // Only the topmost layer traps Tab; a drawer underneath an open
      // dialog must not pull focus back into itself.
      if (e.key !== "Tab" || !cardRef.current || !layer.isTop()) return;
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
      layer.pop();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex bg-[var(--overlay)] backdrop-blur-[3px] animate-fade-in ${OVERLAY_LAYOUT[layout]}`}
      style={lift ? { paddingBottom: keyboard } : undefined}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className={`outline-none ${CARD_LAYOUT[layout]} ${cardClassName}`}
        style={lift ? { maxHeight: "calc(100% - 0.75rem)" } : undefined}
        onClick={(e) => e.stopPropagation()}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={labelledBy ? undefined : label}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {layout === "sheet" && (
          <div
            aria-hidden="true"
            className="sm:hidden mx-auto mt-2 -mb-1 h-1.5 w-10 shrink-0 rounded-full bg-border-strong"
          />
        )}
        {label && !labelledBy && (
          <span id={fallbackTitleId} className="sr-only">
            {label}
          </span>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Title row shared by every dialog: eyebrow, title, subtitle, close button. */
export function ModalHeader({
  titleId,
  eyebrow,
  title,
  subtitle,
  onClose,
  closeLabel = "Close",
  closeDisabled,
  children,
}: {
  titleId?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  closeDisabled?: boolean;
  /** Extra controls rendered before the close button. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 sm:px-5 pt-4 pb-3.5 border-b border-border shrink-0">
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="label mb-0.5">{eyebrow}</div>}
        <h2
          id={titleId}
          className="text-[1.0625rem] font-semibold tracking-tight truncate"
        >
          {title}
        </h2>
        {subtitle && (
          <div className="text-[0.8125rem] text-muted mt-0.5">{subtitle}</div>
        )}
      </div>
      {children}
      {onClose && (
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon -mr-1.5 shrink-0"
          onClick={onClose}
          aria-label={closeLabel}
          disabled={closeDisabled}
        >
          <IconX />
        </button>
      )}
    </div>
  );
}

/** Action row pinned to the bottom of a dialog. */
export function ModalFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-end gap-2 px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-3.5 border-t border-border bg-surface-2/60 rounded-b-[inherit] shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}
