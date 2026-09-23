"use client";

import { useMemo } from "react";
import { useCash, totalBuyIns } from "@/lib/cashStore";
import { avgStackCents, fmtBBCount, stackBB } from "@/lib/cashStack";
import { fmtMoneyCents, fmtSignedCents } from "@/lib/money";
import { fmtDuration } from "@/lib/clock";
import { playedSecOrNull } from "@/lib/playTime";
import { confirmAction } from "@/lib/confirm";
import { StatCol, netTone } from "../StatTiles";
import RecapShell, { RecapTable, type RecapRow } from "../RecapShell";
import UpdateSheetButton from "../standings/UpdateSheetButton";
import {
  buildSessionDraft,
  dollarsFromCents,
} from "@/lib/standings/fromRecap";
import { IconPlus, IconRotateCcw, IconTrophy, IconUsers } from "../icons";

type Row = {
  id: string;
  name: string;
  buyInCount: number;
  moneyIn: number;
  payout: number;
  net: number;
  durationSec: number | null;
};

export default function CashRecap() {
  const name = useCash((s) => s.name);
  const bigBlind = useCash((s) => s.bigBlind);
  const players = useCash((s) => s.players);
  const startedAt = useCash((s) => s.startedAt);
  const endedAt = useCash((s) => s.endedAt);
  const reopenGame = useCash((s) => s.reopenGame);
  const resetGame = useCash((s) => s.resetGame);

  const rows: Row[] = useMemo(() => {
    return players
      .map((p) => {
        const moneyIn = totalBuyIns(p);
        const payout = p.cashOut?.amount ?? 0;
        const net = payout - moneyIn;
        let durationSec: number | null = playedSecOrNull(
          p.playIntervals,
          p.cashOut?.at ?? endedAt ?? 0,
        );
        if (durationSec == null) {
          const firstBuyIn = p.buyIns[0]?.at;
          const end = p.cashOut?.at ?? endedAt;
          if (firstBuyIn && end) {
            durationSec = Math.max(0, Math.round((end - firstBuyIn) / 1000));
          }
        }
        return {
          id: p.id,
          name: p.name,
          buyInCount: p.buyIns.length,
          moneyIn,
          payout,
          net,
          durationSec,
        };
      })
      .sort((a, b) => {
        if (b.net !== a.net) return b.net - a.net;
        const byName = a.name.localeCompare(b.name);
        if (byName !== 0) return byName;
        return a.id.localeCompare(b.id);
      });
  }, [players, endedAt]);

  const totals = useMemo(() => {
    const totalIn = rows.reduce((s, r) => s + r.moneyIn, 0);
    const totalOut = rows.reduce((s, r) => s + r.payout, 0);
    const biggestWin = rows.length > 0 ? rows[0] : null;
    const winners = rows.filter((r) => r.net > 0).length;
    const losers = rows.filter((r) => r.net < 0).length;
    const avgFinalStack = avgStackCents(players);
    const avgBuyIn =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.moneyIn, 0) / rows.length
        : null;
    return {
      totalIn,
      totalOut,
      biggestWin,
      winners,
      losers,
      avgFinalStack,
      avgBuyIn,
    };
  }, [rows, players]);

  const totalDurationSec =
    startedAt && endedAt
      ? Math.max(0, Math.round((endedAt - startedAt) / 1000))
      : null;

  // Built from the same rows shown above, so what gets published is exactly
  // what the recap reports. Cash amounts are cents; the sheet is whole dollars.
  const sessionDraft = useMemo(
    () =>
      buildSessionDraft({
        title: name,
        mode: "cash",
        startedAt,
        endedAt,
        rows: rows.map((r) => ({
          name: r.name,
          buyIn: dollarsFromCents(r.moneyIn),
          cashOut: dollarsFromCents(r.payout),
          buyIns: r.buyInCount,
        })),
      }),
    [name, startedAt, endedAt, rows],
  );

  async function handleReopen() {
    const ok = await confirmAction({
      title: "Reopen the game?",
      message:
        "Players settled when the game ended become active again; anyone who cashed out earlier stays settled.",
      confirmLabel: "Reopen",
    });
    if (ok) reopenGame();
  }

  async function handleNew() {
    const ok = await confirmAction({
      title: "Start a brand-new cash game?",
      message: "This clears all players and transactions.",
      confirmLabel: "Start new",
      tone: "danger",
    });
    if (ok) resetGame();
  }

  const balanced = totals.totalIn === totals.totalOut;
  const winner = totals.biggestWin && totals.biggestWin.net > 0 ? totals.biggestWin : null;

  const tableRows: RecapRow[] = rows.map((r, idx) => ({
    id: r.id,
    rank: `#${idx + 1}`,
    name: r.name,
    detail: `${r.buyInCount}×`,
    played: r.durationSec != null ? fmtDuration(r.durationSec) : "—",
    moneyIn: fmtMoneyCents(r.moneyIn),
    moneyOut: fmtMoneyCents(r.payout),
    net: fmtSignedCents(r.net),
    netValue: r.net,
    highlight: r.net > 0,
  }));

  return (
    <RecapShell
      eyebrow="Game Complete"
      title={name}
      meta={
        <>
          {fmtMoneyCents(totals.totalIn)} in play
          {totalDurationSec != null && <> · {fmtDuration(totalDurationSec)}</>}
          {" · "}
          {rows.length} player{rows.length === 1 ? "" : "s"}
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
            aria-label="New Game"
            title="New game"
          >
            <IconPlus />
            <span className="hidden md:inline">New Game</span>
          </button>
        </>
      }
    >
      {winner && (
        <section className="card relative overflow-hidden p-4 sm:p-5 border-gold/40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-24 size-72 rounded-full blur-3xl"
            style={{ background: "color-mix(in oklab, var(--gold) 14%, transparent)" }}
          />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-4 md:min-w-[15rem]">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold text-2xl ring-1 ring-gold/35">
                <IconTrophy />
              </span>
              <div className="min-w-0">
                <div className="label text-gold">Biggest winner</div>
                <div className="text-2xl font-semibold tracking-tight truncate">
                  {winner.name}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-3 flex-1">
              <StatCol
                label="Net"
                value={fmtSignedCents(winner.net)}
                emphasize
                tone={netTone(winner.net)}
              />
              <StatCol label="In for" value={fmtMoneyCents(winner.moneyIn)} emphasize />
              <StatCol
                label="Out for"
                value={fmtMoneyCents(winner.payout)}
                emphasize
                tone="gold"
              />
              <StatCol label="Buy-ins" value={`${winner.buyInCount}×`} />
              {winner.durationSec != null && (
                <StatCol label="Played" value={fmtDuration(winner.durationSec)} />
              )}
            </div>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="label flex items-center justify-between gap-2 px-1">
            <span className="flex items-center gap-2">
              <IconUsers />
              All players
            </span>
            <span className="normal-case tracking-normal font-medium">
              <span className="text-gain">{totals.winners} up</span>
              {" · "}
              <span className="text-loss">{totals.losers} down</span>
            </span>
          </div>
          <RecapTable rows={tableRows} rankLabel="Rank" />
        </section>
      )}

      <section className="card p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-4">
        <StatCol label="Total in" value={fmtMoneyCents(totals.totalIn)} />
        <StatCol label="Total out" value={fmtMoneyCents(totals.totalOut)} />
        <StatCol
          label={balanced ? "Balanced" : "Diff"}
          value={fmtMoneyCents(Math.abs(totals.totalIn - totals.totalOut))}
          tone={balanced ? "gain" : "loss"}
        />
        <StatCol
          label="Avg final stack"
          value={
            totals.avgFinalStack != null
              ? fmtMoneyCents(Math.round(totals.avgFinalStack))
              : "—"
          }
          hint={
            totals.avgFinalStack != null && bigBlind > 0
              ? fmtBBCount(stackBB(totals.avgFinalStack, bigBlind))
              : undefined
          }
        />
        <StatCol
          label="Avg buy-in"
          value={
            totals.avgBuyIn != null
              ? fmtMoneyCents(Math.round(totals.avgBuyIn))
              : "—"
          }
          hint={
            totals.avgBuyIn != null && bigBlind > 0
              ? fmtBBCount(stackBB(totals.avgBuyIn, bigBlind))
              : undefined
          }
        />
      </section>
    </RecapShell>
  );
}
