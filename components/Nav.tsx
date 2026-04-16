"use client";

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
  const settingsActive = pathname?.startsWith(`${basePath}/settings`);

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
      <div className="flex items-center gap-1 sm:gap-2">
        {mode !== "none" && (
          <>
            <Link
              href={basePath}
              className={`btn btn-sm ${dashboardActive ? "btn-primary" : "btn-ghost"}`}
            >
              Dashboard
            </Link>
            <Link
              href={`${basePath}/settings`}
              className={`btn btn-sm ${settingsActive ? "btn-primary" : "btn-ghost"}`}
            >
              Settings
            </Link>
          </>
        )}
        <Link href="/" className="btn btn-sm btn-ghost" title="Switch mode">
          {mode === "none" ? "Home" : "Switch"}
        </Link>
        {mode === "tournament" && (
          <button
            className="btn btn-sm btn-ghost hidden sm:inline-flex"
            onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
            title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>
        )}
      </div>
    </nav>
  );
}
