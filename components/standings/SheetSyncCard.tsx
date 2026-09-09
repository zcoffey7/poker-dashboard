"use client";

import SheetConnectForm from "./SheetConnectForm";
import { isConnected, useSheet } from "@/lib/sheetStore";
import { useHasHydrated } from "@/lib/useHasHydrated";

/** Settings-page control for the GitHub connection used by "Update Sheet". */
export default function SheetSyncCard() {
  const sheet = useSheet();
  const hydrated = useHasHydrated(useSheet);

  if (!hydrated) {
    return (
      <div className="card p-4 text-sm text-[var(--text-muted)]" aria-busy="true">
        Loading sheet sync…
      </div>
    );
  }

  const connected = isConnected(sheet);
  const last = sheet.published[0];

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div>
        <div className="label">Standings Sheet Sync</div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">
          Lets the recap screen publish a finished game straight to the
          standings repo.
        </div>
      </div>

      {connected ? (
        <div className="flex flex-col gap-2">
          <div className="text-sm">
            Connected to{" "}
            <span className="font-mono">
              {sheet.owner}/{sheet.repo}
            </span>{" "}
            on <span className="font-mono">{sheet.branch}</span>.
          </div>
          {last && (
            <div className="text-xs text-[var(--text-muted)]">
              Last published <span className="font-mono">{last.gameId}</span> on{" "}
              {new Date(last.at).toLocaleDateString()}.
            </div>
          )}
          <button
            className="btn btn-danger self-start"
            onClick={() => {
              if (confirm("Forget the GitHub token on this device?")) {
                sheet.disconnect();
              }
            }}
          >
            Forget token
          </button>
        </div>
      ) : (
        <SheetConnectForm compact />
      )}
    </div>
  );
}
