"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTournament } from "@/lib/store";

export default function Nav() {
  const pathname = usePathname();
  const name = useTournament((s) => s.name);
  const soundEnabled = useTournament((s) => s.settings.soundEnabled);
  const updateSettings = useTournament((s) => s.updateSettings);

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 flex items-center gap-6 sticky top-0 z-20">
      <Link href="/" className="font-semibold text-lg tracking-tight">
        <span className="text-[var(--accent)]">Poker</span>Clock
      </Link>
      <div className="hidden md:block text-[var(--text-muted)] text-sm truncate max-w-[320px]">
        {name}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className={`btn btn-sm ${pathname === "/" ? "btn-primary" : "btn-ghost"}`}
        >
          Dashboard
        </Link>
        <Link
          href="/settings"
          className={`btn btn-sm ${pathname?.startsWith("/settings") ? "btn-primary" : "btn-ghost"}`}
        >
          Settings
        </Link>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() =>
            updateSettings({ soundEnabled: !soundEnabled })
          }
          title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
        >
          {soundEnabled ? "Sound on" : "Sound off"}
        </button>
      </div>
    </nav>
  );
}
