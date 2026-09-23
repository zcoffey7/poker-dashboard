"use client";

import SheetConnectForm from "./SheetConnectForm";
import { isConnected, useSheet } from "@/lib/sheetStore";
import { useHasHydrated } from "@/lib/useHasHydrated";
import { confirmAction } from "@/lib/confirm";
import { Section } from "../Section";
import { IconCheck } from "../icons";

/** Settings-page control for the GitHub connection used by "Update Sheet". */
export default function SheetSyncCard() {
  const sheet = useSheet();
  const hydrated = useHasHydrated(useSheet);

  if (!hydrated) {
    return (
      <div className="card p-5 text-sm text-muted" aria-busy="true">
        Loading sheet sync…
      </div>
    );
  }

  const connected = isConnected(sheet);
  const last = sheet.published[0];

  async function handleForget() {
    const ok = await confirmAction({
      title: "Forget the GitHub token on this device?",
      message: "You'll need to paste it again before the next publish.",
      confirmLabel: "Forget token",
      tone: "danger",
    });
    if (ok) sheet.disconnect();
  }

  return (
    <Section
      title="Standings sheet sync"
      description="Lets the recap screen publish a finished game straight to the standings repo."
      actions={
        connected ? (
          <span className="chip chip-primary">
            <IconCheck />
            Connected
          </span>
        ) : (
          <span className="chip">Not connected</span>
        )
      }
    >
      {connected ? (
        <div className="flex flex-col gap-3">
          <div className="card-2 px-3.5 py-3 text-sm flex flex-col gap-1">
            <div>
              Publishing to{" "}
              <span className="font-mono text-[0.8125rem]">
                {sheet.owner}/{sheet.repo}
              </span>{" "}
              on <span className="font-mono text-[0.8125rem]">{sheet.branch}</span>
            </div>
            {last && (
              <div className="text-xs text-muted">
                Last published <span className="font-mono">{last.gameId}</span> on{" "}
                {new Date(last.at).toLocaleDateString()}
              </div>
            )}
          </div>
          <button className="btn btn-danger self-start" onClick={handleForget}>
            Forget token
          </button>
        </div>
      ) : (
        <SheetConnectForm compact />
      )}
    </Section>
  );
}
