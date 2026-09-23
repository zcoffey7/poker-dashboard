"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTournament } from "@/lib/store";
import { useCash } from "@/lib/cashStore";
import { useHasHydrated } from "@/lib/useHasHydrated";
import Logo, { LogoMark } from "./Logo";
import ThemePicker, { ThemeSwatches } from "./ThemePicker";
import {
  IconLayoutGrid,
  IconMenu,
  IconRepeat,
  IconSliders,
  IconX,
} from "./icons";

type Mode = "tournament" | "cash" | "none";

function modeFromPath(pathname: string | null): Mode {
  if (!pathname) return "none";
  if (pathname.startsWith("/tournament")) return "tournament";
  if (pathname.startsWith("/cash")) return "cash";
  return "none";
}

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
};

const MODE_LABEL: Record<Mode, string> = {
  tournament: "Tournament",
  cash: "Cash game",
  none: "",
};

export default function Nav() {
  const pathname = usePathname();
  const mode = modeFromPath(pathname);

  const tournamentName = useTournament((s) => s.name);
  const cashName = useCash((s) => s.name);
  // Names come from localStorage; wait for rehydration so the static HTML
  // (defaults) and the first client render agree.
  const tournamentReady = useHasHydrated(useTournament);
  const cashReady = useHasHydrated(useCash);

  const name =
    mode === "tournament" && tournamentReady
      ? tournamentName
      : mode === "cash" && cashReady
        ? cashName
        : "";

  const basePath = mode === "cash" ? "/cash" : "/tournament";
  const onSettings = !!pathname?.startsWith(`${basePath}/settings`);
  const links: NavLink[] =
    mode === "none"
      ? []
      : [
          {
            href: basePath,
            label: "Dashboard",
            icon: <IconLayoutGrid />,
            active: !onSettings,
          },
          {
            href: `${basePath}/settings`,
            label: "Settings",
            icon: <IconSliders />,
            active: onSettings,
          },
        ];

  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="h-14 flex items-center gap-3 sm:gap-4 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:px-6">
        {/* Phone: compact title bar — which game you're in, at a glance. */}
        <Link
          href="/"
          className="sm:hidden shrink-0 rounded-lg"
          aria-label="PokerClock home"
        >
          <LogoMark className="size-9" />
        </Link>
        <div className="sm:hidden min-w-0 flex-1 leading-tight">
          {mode !== "none" && (
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-primary">
              {MODE_LABEL[mode]}
              {onSettings && <span className="text-muted"> · Settings</span>}
            </div>
          )}
          <div className="font-semibold truncate text-[0.9375rem]">
            {name || "\u00a0"}
          </div>
        </div>

        {/* Desktop */}
        <Link
          href="/"
          className="hidden sm:inline-flex shrink-0 rounded-lg"
          aria-label="PokerClock home"
        >
          <Logo />
        </Link>
        {mode !== "none" && (
          <span className="chip chip-primary hidden sm:inline-flex">
            {MODE_LABEL[mode]}
          </span>
        )}
        <div className="hidden md:block text-sm text-muted truncate max-w-[320px]">
          {name}
        </div>
        <div className="hidden sm:block flex-1" />

        <div className="hidden sm:flex items-center gap-2">
          {links.length > 0 && (
            <div className="segmented">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={l.active ? "page" : undefined}
                >
                  {l.icon}
                  {l.label}
                </Link>
              ))}
            </div>
          )}
          <Link href="/" className="btn btn-ghost btn-sm">
            <IconRepeat />
            Switch mode
          </Link>
          <span className="w-px h-5 bg-border" aria-hidden="true" />
          <ThemePicker />
        </div>

        <div className="sm:hidden flex items-center">
          {mode !== "none" && (
            <Link
              href={onSettings ? basePath : `${basePath}/settings`}
              className="btn btn-ghost btn-icon"
              aria-label={onSettings ? "Back to dashboard" : "Settings"}
            >
              {onSettings ? <IconLayoutGrid /> : <IconSliders />}
            </Link>
          )}
          {/* Remount on route change so menu state resets without an effect. */}
          <MobileMenu key={pathname ?? ""} links={links} mode={mode} name={name} />
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({
  links,
  mode,
  name,
}: {
  links: NavLink[];
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

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 px-3 h-12 rounded-[12px] text-[0.9375rem] font-medium ${
      active ? "bg-primary/12 text-primary" : "active:bg-hover"
    }`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="btn btn-ghost btn-icon"
        aria-label="Menu"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? <IconX /> : <IconMenu />}
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[min(19rem,calc(100vw-1.5rem))] card p-2 shadow-2xl z-30 animate-pop-in"
        >
          {mode !== "none" && (
            <div className="px-3 pt-1.5 pb-3 mb-1 border-b border-border">
              <div className="label">{MODE_LABEL[mode]}</div>
              {name && (
                <div className="font-semibold truncate mt-0.5">{name}</div>
              )}
            </div>
          )}
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              className={itemClass(l.active)}
              aria-current={l.active ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {l.icon}
              {l.label}
            </Link>
          ))}
          <Link
            href="/"
            role="menuitem"
            className={itemClass(false)}
            onClick={() => setMenuOpen(false)}
          >
            <IconRepeat />
            Switch mode
          </Link>
          <div className="px-1 pt-3 pb-1 mt-1 border-t border-border">
            <div className="label px-2 mb-2">Theme</div>
            <ThemeSwatches />
          </div>
        </div>
      )}
    </div>
  );
}
