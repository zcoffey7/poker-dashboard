"use client";

import { useId, useMemo, useState } from "react";
import ModalShell from "../ModalShell";
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
      cardClassName="w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="min-w-0">
          <div className="label" id={titleId}>
            Update Sheet
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {phase === "done"
              ? "Committed to the standings repo."
              : "Review the night, then publish it to the standings."}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          disabled={phase === "publishing"}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {!connected && (
          <section className="flex flex-col gap-2" data-testid="sheet-connect">
            <div className="label">Connect GitHub</div>
            <SheetConnectForm compact />
          </section>
        )}

        {connected && phase !== "done" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="label">Title</span>
                <input
                  className="input"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                  aria-label="Session title"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Date</span>
                <input
                  className="input font-mono"
                  type="date"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, date: e.target.value }))
                  }
                  aria-label="Session date"
                />
              </label>
            </div>

            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <div className="label">
                  Players ({draft.players.length}) · {draft.mode}
                </div>
                <span
                  className={`text-xs font-mono ${
                    balanced ? "text-[var(--text-muted)]" : "text-[var(--amber)]"
                  }`}
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
                    className="card-2 p-2 rounded flex flex-wrap items-center gap-2"
                    data-testid="sheet-player-row"
                  >
                    <input
                      className="input flex-1 min-w-[8rem] text-sm"
                      value={p.name}
                      onChange={(e) => updatePlayer(i, { name: e.target.value })}
                      aria-label={`Sheet name for player ${i + 1}`}
                    />
                    <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      In
                      <NumberInput
                        className="input w-20 font-mono text-sm"
                        value={p.buyIn}
                        onChange={(n) => updatePlayer(i, { buyIn: n })}
                        min={0}
                        step={1}
                        aria-label={`${p.name} buy-in`}
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      Out
                      <NumberInput
                        className="input w-20 font-mono text-sm"
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
              <p
                className="text-xs text-[var(--amber)]"
                data-testid="sheet-already-published"
              >
                This exact session was already published from this device as{" "}
                <span className="font-mono">{alreadyPublished.gameId}</span>.
                Publishing again would count the night twice.
              </p>
            )}

            {!balanced && (
              <p className="text-xs text-[var(--amber)]">
                Buy-ins and cash-outs don&apos;t match. That usually means a
                missing rebuy or a rounded sub-dollar stack — fix it above, or
                publish anyway and reconcile later.
              </p>
            )}

            {error && (
              <p
                className="text-xs text-[var(--amber)]"
                role="alert"
                data-testid="sheet-error"
              >
                {error}
              </p>
            )}
          </>
        )}

        {phase === "done" && result && (
          <section className="flex flex-col gap-3" data-testid="sheet-success">
            <div className="card-2 p-3 rounded flex flex-col gap-1">
              <div className="text-sm font-semibold">
                Added {result.update.entry.title}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Recorded as{" "}
                <span className="font-mono">{result.update.entry.id}</span> in
                the Overall and{" "}
                {result.update.session.mode === "cash" ? "Cash" : "Tournament"}{" "}
                standings plus History.
              </div>
              <a
                className="text-xs underline underline-offset-2 mt-1"
                href={result.commit.htmlUrl}
                target="_blank"
                rel="noreferrer"
              >
                View commit
              </a>
            </div>

            <div className="flex flex-col gap-1">
              <div className="label">Overall standings</div>
              {result.update.changes.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 text-xs px-1 py-1 border-b border-[var(--border)] last:border-0"
                >
                  <span className="flex-1 font-medium truncate">
                    {c.name}
                    {c.isNewPlayer && (
                      <span className="text-[var(--text-muted)]"> (new)</span>
                    )}
                  </span>
                  <span className="font-mono text-[var(--text-muted)]">
                    {c.gamesBefore} → {c.gamesAfter} GP
                  </span>
                  <span
                    className={`font-mono ${
                      c.netAfter >= 0
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {signed(c.netAfter)}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              The standings site rebuilds from this commit automatically — give
              it about a minute, then pull to refresh.
            </p>
          </section>
        )}
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
        {phase === "done" ? (
          <button className="btn btn-primary" onClick={onClose}>
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
              className="btn btn-primary"
              onClick={publish}
              disabled={!connected || phase === "publishing"}
              data-testid="sheet-publish"
            >
              {phase === "publishing" ? "Publishing…" : "Publish to sheet"}
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
}
