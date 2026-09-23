"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  isThemeId,
  themeColorFor,
  type ThemeId,
} from "@/lib/themes";
import { IconCheck, IconPalette } from "./icons";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function readTheme(): ThemeId {
  const t = document.documentElement.getAttribute("data-theme");
  return isThemeId(t) ? t : DEFAULT_THEME;
}

export function setTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Private mode / storage disabled: the theme still applies for this visit.
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themeColorFor(id));
  for (const l of listeners) l();
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
}

function Swatch({ colors }: { colors: readonly string[] }) {
  const [surface, primary, gold] = colors;
  return (
    <span
      aria-hidden="true"
      className="relative inline-block size-5 shrink-0 rounded-full ring-1 ring-border-strong overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${surface} 0 50%, ${primary} 50% 100%)`,
      }}
    >
      <span
        className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: gold }}
      />
    </span>
  );
}

/** Compact palette button with a dropdown of themes (desktop nav). */
export default function ThemePicker({ align = "right" }: { align?: "left" | "right" }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon"
        aria-label="Color theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Color theme"
        onClick={() => setOpen((v) => !v)}
      >
        <IconPalette />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Color theme"
          className={`absolute top-full mt-2 w-64 card p-1.5 z-30 animate-pop-in ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className="w-full flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-left hover:bg-hover"
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
              >
                <Swatch colors={t.swatch} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-muted leading-snug">
                    {t.description}
                  </span>
                </span>
                {active && <IconCheck className="text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Inline row of theme buttons (mobile menu, landing page). */
export function ThemeSwatches() {
  const theme = useTheme();
  return (
    <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Color theme">
      {THEMES.map((t) => {
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            className={`flex flex-col items-center gap-1.5 rounded-[10px] border px-2 py-2 text-xs font-medium transition-colors ${
              active
                ? "border-primary text-text bg-surface-2"
                : "border-border text-muted hover:bg-hover"
            }`}
            onClick={() => setTheme(t.id)}
          >
            <Swatch colors={t.swatch} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
