"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTournament } from "@/lib/store";
import { useCash } from "@/lib/cashStore";

type Mode = "tournament" | "cash" | "none";

function modeFromPath(pathname: string | null): Mode {
  if (!pathname) return "none";
  if (pathname.startsWith("/tournament")) return "tournament";
  if (pathname.startsWith("/cash")) return "cash";
  return "none";
}

type NavItem =
  | { kind: "link"; href: string; label: string; active: boolean }
  | { kind: "action"; label: string; title?: string; onClick: () => void };

export default function Nav() {
  const pathname = usePathname();
  const mode = modeFromPath(pathname);

  const tournamentName = useTournament((s) => s.name);
  const cashName = useCash((s) => s.name);
  const soundEnabled = useTournament((s) => s.settings.soundEnabled);
  const updateSettings = useTournament((s) => s.updateSettings);

  const name =
    mode === "tournament"
      ? tournamentName
      : mode === "cash"
        ? cashName
        : "";

  const basePath = mode === "cash" ? "/cash" : "/tournament";
  const dashboardActive =
    pathname === basePath || pathname === `${basePath}/`;
  const settingsActive = !!pathname?.startsWith(`${basePath}/settings`);

  const items: NavItem[] = [];
  if (mode !== "none") {
    items.push(
      {
        kind: "link",
        href: basePath,
        label: "Dashboard",
        active: dashboardActive,
      },
      {
        kind: "link",
        href: `${basePath}/settings`,
        label: "Settings",
        active: settingsActive,
      },
    );
  }
  items.push({
    kind: "link",
    href: "/",
    label: mode === "none" ? "Home" : "Switch mode",
    active: pathname === "/",
  });
  if (mode === "tournament") {
    items.push({
      kind: "action",
      label: soundEnabled ? "Mute sounds" : "Unmute sounds",
      title: soundEnabled ? "Mute sounds" : "Unmute sounds",
      onClick: () => updateSettings({ soundEnabled: !soundEnabled }),
    });
  }

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-6 sticky top-0 z-20">
      <Link href="/" className="font-semibold text-lg tracking-tight shrink-0">
        <span className="text-[var(--accent)]">Poker</span>Clock
      </Link>
      {mode !== "none" && (
        <span className="chip chip-accent uppercase hidden sm:inline-flex">
          {mode === "tournament" ? "Tournament" : "Cash"}
        </span>
      )}
      <div className="hidden md:block text-[var(--text-muted)] text-sm truncate max-w-[320px]">
        {name}
      </div>
      <div className="flex-1" />

      {/* Desktop / tablet inline links */}
      <div className="hidden sm:flex items-center gap-2">
        {items.map((it, i) =>
          it.kind === "link" ? (
            <Link
              key={`l-${i}`}
              href={it.href}
              className={`btn btn-sm ${it.active ? "btn-primary" : "btn-ghost"}`}
            >
              {it.label}
            </Link>
          ) : (
            <button
              key={`a-${i}`}
              className="btn btn-sm btn-ghost"
              onClick={it.onClick}
              title={it.title}
            >
              {it.label}
            </button>
          ),
        )}
      </div>

      {/* Mobile hamburger — remount on route change so menu state resets without an effect */}
      <MobileMenu
        key={pathname ?? ""}
        items={items}
        mode={mode}
        name={name}
      />
    </nav>
  );
}

function MobileMenu({
  items,
  mode,
  name,
}: {
  items: NavItem[];
  mode: Mode;
  name: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="sm:hidden relative" ref={menuRef}>
      <button
        className="btn btn-sm btn-ghost !px-2.5"
        aria-label="Menu"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <HamburgerIcon open={menuOpen} />
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-[200px] card p-1 shadow-2xl z-30"
        >
          {mode !== "none" && (
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] mb-1 flex items-center justify-between gap-2">
              <span>{mode === "tournament" ? "Tournament" : "Cash"}</span>
              {name && (
                <span className="truncate text-[var(--text)] font-medium normal-case tracking-normal">
                  {name}
                </span>
              )}
            </div>
          )}
          {items.map((it, i) =>
            it.kind === "link" ? (
              <Link
                key={`ml-${i}`}
                href={it.href}
                role="menuitem"
                className={`block px-3 py-2 rounded text-sm ${
                  it.active
                    ? "bg-[var(--accent)] text-white"
                    : "hover:bg-black/30"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {it.label}
              </Link>
            ) : (
              <button
                key={`ma-${i}`}
                role="menuitem"
                className="w-full text-left px-3 py-2 rounded text-sm hover:bg-black/30"
                onClick={() => {
                  it.onClick();
                  setMenuOpen(false);
                }}
              >
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}
