"use client";

import { useMemo, useState } from "react";
import { useTournament } from "@/lib/store";
import { useTournamentStats } from "@/lib/useTournamentStats";
import { confirmAction } from "@/lib/confirm";
import {
  computeCashPayouts,
  computeChopAmounts,
  floorTo,
  CASH_INCREMENT,
} from "@/lib/payouts";
import { fmtDuration } from "@/lib/clock";
import { playedSecOrNull } from "@/lib/playTime";
import { StatCol, netTone } from "./StatTiles";
import RecapShell, { RecapTable, type RecapRow } from "./RecapShell";
import UpdateSheetButton from "./standings/UpdateSheetButton";
import { buildSessionDraft } from "@/lib/standings/fromRecap";
import type { Player } from "@/lib/types";
import { IconPlus, IconRotateCcw, IconTrophy, IconUsers } from "./icons";

type Row = {
  id: string;
  name: string;
  place: number | null;
  isCoWinner: boolean;
  durationSec: number | null;
  entries: number;
  rebuys: number;
  addOns: number;
  moneyIn: number;
  payout: number;
  net: number;
};

function placeLabel(place: number | null, isCoWinner: boolean): string {
  if (isCoWinner) return "Chop";
  if (place == null) return "—";
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `${place}th`;
}

function fmtSignedDollars(n: number): string {
  return `${n >= 0 ? "+" : "−"}$${Math.abs(n).toLocaleString()}`;
}

export default function GameRecap() {
  // Narrow selectors so the recap only re-renders when relevant fields change.
  const name = useTournament((s) => s.name);
  const players = useTournament((s) => s.players);
  const buyIn = useTournament((s) => s.buyIn);
  const addOnCost = useTournament((s) => s.addOnCost);
  const rebuyCost = useTournament((s) => s.rebuyCost);
  const payouts = useTournament((s) => s.payouts);
  const startedAt = useTournament((s) => s.startedAt);
  const finishedAt = useTournament((s) => s.finishedAt);
  const finishType = useTournament((s) => s.finishType);
  const chopShares = useTournament((s) => s.chopShares);
  const storedChopAmounts = useTournament((s) => s.chopAmounts);
  const unfinishTournament = useTournament((s) => s.unfinishTournament);
  const resetTournament = useTournament((s) => s.resetTournament);

  const stats = useTournamentStats();
  const pool = stats.prizePool;

  // Only pay as many spots as there are ranked finishers. Everything else
  // (including any unpaid percentage) falls through to 1st as dust.
  const playersInFinalStanding = useMemo(
    () => players.filter((p) => p.finishPlace != null).length,
    [players],
  );
  const { amounts: cashAmounts } = useMemo(
    () => computeCashPayouts(payouts, pool, playersInFinalStanding),
    [payouts, pool, playersInFinalStanding],
  );
  // Exact dollar amounts entered at chop time take precedence; the
  // percentage-based conversion only remains for legacy finished games.
  const chopAmounts = useMemo(() => {
    if (storedChopAmounts && Object.keys(storedChopAmounts).length > 0) {
      return storedChopAmounts;
    }
    return chopShares ? computeChopAmounts(chopShares, pool) : {};
  }, [storedChopAmounts, chopShares, pool]);

  // Group players by finishPlace so that if multiple players share a place
  // (e.g. a manual tie outside of a formal chop) we can split the money.
  const placeBuckets = useMemo(() => {
    const buckets = new Map<number, Player[]>();
    for (const p of players) {
      if (p.finishPlace == null) continue;
      const existing = buckets.get(p.finishPlace);
      if (existing) existing.push(p);
      else buckets.set(p.finishPlace, [p]);
    }
    // Stable sort within a bucket by id so "lowest id" gets the rounding
    // remainder deterministically.
    for (const bucket of buckets.values()) {
      bucket.sort((a, b) => a.id.localeCompare(b.id));
    }
    return buckets;
  }, [players]);

  // Per-player payout for the non-chop flow, accounting for shared places.
  const placePayouts = useMemo(() => {
    const map = new Map<string, number>();
    for (const [place, bucket] of placeBuckets) {
      const totalForPlace = cashAmounts[place] ?? 0;
      if (bucket.length <= 1) {
        if (bucket[0]) map.set(bucket[0].id, totalForPlace);
        continue;
      }
      const each = floorTo(totalForPlace / bucket.length, CASH_INCREMENT);
      const distributed = each * bucket.length;
      const remainder = Math.max(0, totalForPlace - distributed);
      bucket.forEach((p, i) => {
        map.set(p.id, each + (i === 0 ? remainder : 0));
      });
    }
    return map;
  }, [placeBuckets, cashAmounts]);

  // Capture "now" once at mount so re-renders don't cause the "played for"
  // durations to drift. `useState`'s initializer runs only on first render,
  // which keeps this pure per React 19's component purity rules. GameRecap is
  // only mounted while `finishedAt` is set, and remounts on the next finish.
  const [mountedAt] = useState(() => Date.now());
  const now = finishedAt ?? mountedAt;

  const rows: Row[] = useMemo(() => {
    const isChop =
      finishType === "chop" && Object.keys(chopAmounts).length > 0;
    const chopSet = isChop
      ? new Set(Object.keys(chopAmounts))
      : new Set<string>();

    return players
      .map((p: Player) => {
        const rebuys = p.rebuys ?? 0;
        const entries = 1 + rebuys;
        const addOns = p.addOns ?? 0;
        const moneyIn = buyIn + rebuys * rebuyCost + addOns * addOnCost;
        const isCoWinner = isChop && chopSet.has(p.id);
        let payout = 0;
        if (isCoWinner) {
          payout = chopAmounts[p.id] ?? 0;
        } else if (p.finishPlace != null) {
          payout = placePayouts.get(p.id) ?? 0;
        }
        let durationSec = playedSecOrNull(
          p.playIntervals,
          p.eliminatedAt ?? finishedAt ?? now,
        );
        if (durationSec == null && startedAt) {
          const end = p.eliminatedAt ?? finishedAt ?? now;
          durationSec = Math.max(0, Math.round((end - startedAt) / 1000));
        }
        return {
          id: p.id,
          name: p.name,
          place: p.finishPlace ?? null,
          isCoWinner,
          durationSec,
          entries,
          rebuys: p.rebuys ?? 0,
          addOns,
          moneyIn,
          payout,
          net: payout - moneyIn,
        };
      })
      .sort((a, b) => {
        // Co-winners first, then by place ascending, then unset last.
        if (a.isCoWinner !== b.isCoWinner) return a.isCoWinner ? -1 : 1;
        const ap = a.place ?? Number.POSITIVE_INFINITY;
        const bp = b.place ?? Number.POSITIVE_INFINITY;
        return ap - bp;
      });
  }, [
    players,
    buyIn,
    rebuyCost,
    addOnCost,
    placePayouts,
    chopAmounts,
    finishType,
    startedAt,
    finishedAt,
    now,
  ]);

  const winners = rows.filter((r) =>
    finishType === "chop" ? r.isCoWinner : r.place === 1,
  );
  const others = rows.filter((r) =>
    finishType === "chop" ? !r.isCoWinner : r.place !== 1,
  );

  const totalDurationSec =
    startedAt && finishedAt
      ? Math.max(0, Math.round((finishedAt - startedAt) / 1000))
      : null;

  // Reuses the rows rendered below so payouts, rebuys and add-ons reach the
  // sheet exactly as they appear in the recap.
  const sessionDraft = useMemo(
    () =>
      buildSessionDraft({
        title: name,
        mode: "tournament",
        startedAt,
        endedAt: finishedAt,
        rows: rows.map((r) => ({
          name: r.name,
          buyIn: r.moneyIn,
          cashOut: r.payout,
          buyIns: r.entries,
        })),
      }),
    [name, startedAt, finishedAt, rows],
  );

  async function handleReopen() {
    const ok = await confirmAction({
      title: "Reopen the tournament?",
      message:
        "You can keep playing; the recap will still be available once it ends again.",
      confirmLabel: "Reopen",
    });
    if (ok) unfinishTournament();
  }

  async function handleNew() {
    const ok = await confirmAction({
      title: "Start a brand-new tournament?",
      message: "This clears all players, chips, and settings.",
      confirmLabel: "Start new",
      tone: "danger",
    });
    if (ok) resetTournament();
  }

  const tableRows: RecapRow[] = others.map((r) => ({
    id: r.id,
    rank: placeLabel(r.place, r.isCoWinner),
    name: r.name,
    detail: `${r.entries}×${r.addOns > 0 ? ` · ${r.addOns} add-on${r.addOns === 1 ? "" : "s"}` : ""}`,
    played: r.durationSec != null ? fmtDuration(r.durationSec) : "—",
    moneyIn: `$${r.moneyIn.toLocaleString()}`,
    moneyOut: `$${r.payout.toLocaleString()}`,
    net: fmtSignedDollars(r.net),
    netValue: r.net,
    highlight: r.payout > 0,
  }));

  return (
    <RecapShell
      eyebrow={finishType === "chop" ? "Chopped" : "Tournament Complete"}
      title={name}
      meta={
        <>
          <span className="text-gold font-medium">${pool.toLocaleString()}</span> prize pool
          {totalDurationSec != null && <> · Ran for {fmtDuration(totalDurationSec)}</>}
          {" · "}
          {stats.totalPlayers} player{stats.totalPlayers === 1 ? "" : "s"}
        </>
      }
      actions={
        <>
          <UpdateSheetButton session={sessionDraft} />
          <button
            className="btn btn-icon md:w-auto md:px-3.5"
            onClick={handleReopen}
            aria-label="Reopen"
            title="Reopen"
          >
            <IconRotateCcw />
            <span className="hidden md:inline">Reopen</span>
          </button>
          <button
            className="btn btn-icon md:w-auto md:px-3.5"
            onClick={handleNew}
            aria-label="New Tournament"
            title="New tournament"
          >
            <IconPlus />
            <span className="hidden md:inline">New Tournament</span>
          </button>
        </>
      }
    >
      {winners.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="label">
            {finishType === "chop" ? "Co-winners" : "Champion"}
          </div>
          <div
            className={`grid gap-3 ${
              winners.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            }`}
          >
            {winners.map((w) => (
              <WinnerCard key={w.id} row={w} wide={winners.length === 1} />
            ))}
          </div>
        </section>
      )}

      {tableRows.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="label flex items-center gap-2">
            <IconUsers />
            Participants
          </div>
          <RecapTable rows={tableRows} rankLabel="Place" />
        </section>
      )}
    </RecapShell>
  );
}

function WinnerCard({ row, wide }: { row: Row; wide: boolean }) {
  return (
    <div className="card relative overflow-hidden p-5 border-gold/40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-24 size-72 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklab, var(--gold) 14%, transparent)" }}
      />
      <div
        className={`relative flex gap-5 ${
          wide ? "flex-col md:flex-row md:items-center" : "flex-col"
        }`}
      >
        <div className="flex items-center gap-4 md:min-w-[16rem]">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold text-2xl ring-1 ring-gold/35">
            <IconTrophy />
          </span>
          <div className="min-w-0">
            <div className="label text-gold">
              {placeLabel(row.place, row.isCoWinner)}
            </div>
            <div className="text-2xl font-semibold tracking-tight truncate">
              {row.name}
            </div>
          </div>
        </div>
        <div
          className={`grid gap-x-6 gap-y-3 flex-1 ${
            wide ? "grid-cols-3 md:grid-cols-6" : "grid-cols-3"
          }`}
        >
          <StatCol label="In for" value={`$${row.moneyIn.toLocaleString()}`} emphasize />
          <StatCol
            label="Out for"
            value={`$${row.payout.toLocaleString()}`}
            emphasize
            tone="gold"
          />
          <StatCol
            label="Net"
            value={fmtSignedDollars(row.net)}
            emphasize
            tone={netTone(row.net)}
          />
          <StatCol label="Buy-ins" value={`${row.entries}×`} />
          <StatCol label="Add-ons" value={`${row.addOns}×`} />
          {row.durationSec != null && (
            <StatCol label="Played" value={fmtDuration(row.durationSec)} />
          )}
        </div>
      </div>
    </div>
  );
}
