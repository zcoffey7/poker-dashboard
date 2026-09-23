"use client";

import Link from "next/link";
import { useTournament } from "@/lib/store";
import { useCash } from "@/lib/cashStore";
import { computeCashLiveStats } from "@/lib/cashSelectors";
import { fmtMoneyCents } from "@/lib/money";
import { useHasHydrated } from "@/lib/useHasHydrated";
import { IconArrowRight, IconCoins, IconTrophy } from "./icons";

type Status = { live: boolean; text: string; cta: string } | null;

function useTournamentStatus(): Status {
  const hydrated = useHasHydrated(useTournament);
  const startedAt = useTournament((s) => s.startedAt);
  const finishedAt = useTournament((s) => s.finishedAt);
  const players = useTournament((s) => s.players);
  const level = useTournament((s) => s.blindStructure[s.clock.currentLevel]);
  if (!hydrated) return null;
  if (finishedAt) return { live: false, text: "Finished · recap ready", cta: "View recap" };
  if (startedAt) {
    const active = players.filter((p) => !p.eliminated).length;
    const where = level?.isBreak ? "On break" : `Level ${level?.level ?? 1}`;
    return {
      live: true,
      text: `${where} · ${active} of ${players.length} left`,
      cta: "Resume",
    };
  }
  if (players.length > 0) {
    return {
      live: false,
      text: `${players.length} player${players.length === 1 ? "" : "s"} registered`,
      cta: "Continue setup",
    };
  }
  return null;
}

function useCashStatus(): Status {
  const hydrated = useHasHydrated(useCash);
  const players = useCash((s) => s.players);
  const endedAt = useCash((s) => s.endedAt);
  if (!hydrated || players.length === 0) return null;
  if (endedAt) return { live: false, text: "Finished · recap ready", cta: "View recap" };
  const stats = computeCashLiveStats(players);
  return {
    live: true,
    text: `${stats.activeCount} seated · ${fmtMoneyCents(stats.inPlay)} in play`,
    cta: "Resume",
  };
}

export default function ModeCards() {
  const tournament = useTournamentStatus();
  const cash = useCashStatus();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ModeCard
        href="/tournament"
        title="Tournament"
        badge="Structured"
        icon={<IconTrophy />}
        description="Timed blinds, seating and table balancing, rebuys and add-ons, payouts, and an end-of-night recap."
        status={tournament}
        defaultCta="Open tournament"
      />
      <ModeCard
        href="/cash"
        title="Cash Game"
        badge="Casual"
        icon={<IconCoins />}
        description="Fixed blinds on one table, buy-ins and rebuys for any amount, individual cash-outs, and a balanced settle-up."
        status={cash}
        defaultCta="Open cash game"
      />
    </div>
  );
}

function ModeCard({
  href,
  title,
  badge,
  icon,
  description,
  status,
  defaultCta,
}: {
  href: string;
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  status: Status;
  defaultCta: string;
}) {
  return (
    <Link
      href={href}
      className="card group relative overflow-hidden p-6 flex flex-col gap-4 transition-[border-color,transform] hover:border-primary/60 hover:-translate-y-0.5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary text-xl ring-1 ring-primary/25">
          {icon}
        </span>
        <span className="chip">{badge}</span>
      </div>
      <div>
        <div className="text-xl font-semibold tracking-tight">{title}</div>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {status ? (
          <span
            className={`inline-flex items-center gap-2 text-xs font-medium ${
              status.live ? "text-primary" : "text-muted"
            }`}
          >
            {status.live && <span className="live-dot" aria-hidden="true" />}
            {status.text}
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          {status?.cta ?? defaultCta}
          <IconArrowRight className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
