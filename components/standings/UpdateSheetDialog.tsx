"use client";

import { useId, useMemo, useState } from "react";
import ModalShell, { ModalFooter, ModalHeader } from "../ModalShell";
import NumberInput from "../NumberInput";
import SheetConnectForm from "./SheetConnectForm";
import { isConnected, repoConfig, useSheet } from "@/lib/sheetStore";
import { publishSession } from "@/lib/standings/publish";
import {
  sessionBuyIn,
  sessionCashOut,
  sessionFingerprint,
} from "@/lib/standings/session";
import type { SessionDraft } from "@/lib/standings/types";
import type { PublishResult } from "@/lib/standings/publish";
import { Field } from "../Section";
import { IconAlert, IconCheck, IconExternal, IconUpload } from "../icons";

type Props = {
  session: SessionDraft;
  onClose: () => void;
};

type Phase = "review" | "publishing" | "done";

function signed(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function UpdateSheetDialog({ session, onClose }: Props) {
  const sheet = useSheet();
  const connected = isConnected(sheet);

  const [draft, setDraft] = useState<SessionDraft>(session);
  const [phase, setPhase] = useState<Phase>("review");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);

  const titleId = useId();

  const fingerprint = useMemo(() => sessionFingerprint(draft), [draft]);
  const alreadyPublished = sheet.published.find(
    (p) => p.fingerprint === fingerprint,
  );

  const buyIn = sessionBuyIn(draft);
  const cashOut = sessionCashOut(draft);
  const balanced = buyIn === cashOut;

  function updatePlayer(index: number, patch: Partial<SessionDraft["players"][number]>) {
    setDraft((d) => ({
      ...d,
      players: d.players.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  async function publish() {
    setPhase("publishing");
    setError(null);
    try {
      const published = await publishSession(repoConfig(sheet), draft);
      sheet.recordPublish({
        fingerprint,
        gameId: published.update.entry.id,
        commitUrl: published.commit.htmlUrl,
        at: Date.now(),
      });
      setResult(published);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("review");
    }
  }

  return (
    <ModalShell
      onClose={phase === "publishing" ? undefined : onClose}
      labelledBy={titleId}
      cardClassName="w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
    >
      <ModalHeader
        titleId={titleId}
        title="Update Sheet"
        subtitle={
          phase === "done"
            ? "Committed to the standings repo."
            : "Review the night, then publish it to the standings."
        }
        onClose={onClose}
        closeDisabled={phase === "publishing"}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
        {!connected && (
          <section className="flex flex-col gap-3" data-testid="sheet-connect">
            <div className="label">Connect GitHub</div>
            <SheetConnectForm compact />
          </section>
        )}

        {connected && phase !== "done" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Title">
                <input
                  className="input"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                  aria-label="Session title"
                />
              </Field>
              <Field label="Date">
                <input
                  className="input tabular-nums"
                  type="date"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, date: e.target.value }))
                  }
                  aria-label="Session date"
                />
              </Field>
            </div>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="label">
                  {draft.players.length} players · {draft.mode}
                </div>
                <span
                  className={`chip tabular-nums ${balanced ? "chip-primary" : "chip-gold"}`}
                  data-testid="sheet-balance"
                >
                  {balanced
                    ? `Balanced · $${buyIn}`
                    : `Off by $${Math.abs(cashOut - buyIn)}`}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {draft.players.map((p, i) => (
                  <div
                    key={i}
                    className="card-2 p-2.5 grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] items-center gap-2"
                    data-testid="sheet-player-row"
                  >
                    <input
                      className="input input-sm col-span-2 sm:col-span-1 font-medium"
                      value={p.name}
                      onChange={(e) => updatePlayer(i, { name: e.target.value })}
                      aria-label={`Sheet name for player ${i + 1}`}
                    />
                    <label className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.6875rem] font-semibold uppercase tracking-wide text-subtle">
                        In
                      </span>
                      <NumberInput
                        className="input input-sm pl-9 text-right tabular-nums"
                        value={p.buyIn}
                        onChange={(n) => updatePlayer(i, { buyIn: n })}
                        min={0}
                        step={1}
                        aria-label={`${p.name} buy-in`}
                      />
                    </label>
                    <label className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.6875rem] font-semibold uppercase tracking-wide text-subtle">
                        Out
                      </span>
                      <NumberInput
                        className="input input-sm pl-10 text-right tabular-nums"
                        value={p.cashOut}
                        onChange={(n) => updatePlayer(i, { cashOut: n })}
                        min={0}
                        step={1}
                        aria-label={`${p.name} cash-out`}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {alreadyPublished && (
              <Notice testId="sheet-already-published">
                This exact session was already published from this device as{" "}
                <span className="font-mono">{alreadyPublished.gameId}</span>.
                Publishing again would count the night twice.
              </Notice>
            )}

            {!balanced && (
              <Notice>
                Buy-ins and cash-outs don&apos;t match. That usually means a
                missing rebuy or a rounded sub-dollar stack — fix it above, or
                publish anyway and reconcile later.
              </Notice>
            )}

            {error && (
              <Notice testId="sheet-error" role="alert" tone="loss">
                {error}
              </Notice>
            )}
          </>
        )}

        {phase === "done" && result && (
          <section className="flex flex-col gap-4" data-testid="sheet-success">
            <div className="card-2 p-4 flex gap-3 border-primary/40">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <IconCheck />
              </span>
              <div className="min-w-0 flex flex-col gap-1">
                <div className="font-semibold">Added {result.update.entry.title}</div>
                <div className="text-sm text-muted">
                  Recorded as{" "}
                  <span className="font-mono text-xs">{result.update.entry.id}</span>{" "}
                  in the Overall and{" "}
                  {result.update.session.mode === "cash" ? "Cash" : "Tournament"}{" "}
                  standings plus History.
                </div>
                <a
                  className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
                  href={result.commit.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View commit
                  <IconExternal size="0.9em" />
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="label mb-1">Overall standings</div>
              {result.update.changes.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 text-sm py-2 border-b border-border last:border-0"
                >
                  <span className="flex-1 font-medium truncate">
                    {c.name}
                    {c.isNewPlayer && <span className="text-muted"> (new)</span>}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {c.gamesBefore} → {c.gamesAfter} GP
                  </span>
                  <span
                    className={`w-24 text-right font-semibold tabular-nums ${
                      c.netAfter > 0 ? "text-gain" : c.netAfter < 0 ? "text-loss" : "text-muted"
                    }`}
                  >
                    {signed(c.netAfter)}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted">
              The standings site rebuilds from this commit automatically — give
              it about a minute, then pull to refresh.
            </p>
          </section>
        )}
      </div>

      <ModalFooter>
        {phase === "done" ? (
          <button className="btn btn-primary flex-1 sm:flex-none" onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button
              className="btn btn-ghost"
              onClick={onClose}
              disabled={phase === "publishing"}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary flex-1 sm:flex-none"
              onClick={publish}
              disabled={!connected || phase === "publishing"}
              data-testid="sheet-publish"
            >
              {phase !== "publishing" && <IconUpload />}
              {phase === "publishing" ? "Publishing…" : "Publish to sheet"}
            </button>
          </>
        )}
      </ModalFooter>
    </ModalShell>
  );
}

function Notice({
  children,
  testId,
  role,
  tone = "warn",
}: {
  children: React.ReactNode;
  testId?: string;
  role?: "alert";
  tone?: "warn" | "loss";
}) {
  return (
    <div
      className={`flex gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
        tone === "loss"
          ? "border-loss/35 bg-loss/8 text-loss"
          : "border-warn/35 bg-warn/8 text-warn"
      }`}
      data-testid={testId}
      role={role}
    >
      <IconAlert className="mt-0.5 shrink-0" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
