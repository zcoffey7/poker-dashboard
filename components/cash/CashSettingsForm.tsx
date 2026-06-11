"use client";

import { useState } from "react";
import { useCash } from "@/lib/cashStore";
import { fromCents } from "@/lib/money";
import { useHasHydrated } from "@/lib/useHasHydrated";
import NumberInput from "../NumberInput";

type Draft = {
  name: string;
  /** Dollars (float). Converted to cents at save. */
  smallBlind: number;
  bigBlind: number;
  defaultBuyIn: number;
};

export default function CashSettingsForm() {
  const name = useCash((s) => s.name);
  const smallBlind = useCash((s) => s.smallBlind);
  const bigBlind = useCash((s) => s.bigBlind);
  const defaultBuyIn = useCash((s) => s.defaultBuyIn);
  // Wait for persist rehydration before seeding the draft, so the form
  // doesn't flash default values and then jump to the stored ones (same
  // gate as the tournament SettingsForm).
  const hydrated = useHasHydrated(useCash);

  // Remount the inner form when persisted settings change, so the draft is
  // always seeded from the latest store values. Avoids the set-state-in-effect
  // anti-pattern.
  const signature = `${name}|${smallBlind}|${bigBlind}|${defaultBuyIn}`;

  if (!hydrated) {
    return (
      <div className="card p-4 text-sm text-[var(--text-muted)]" aria-busy="true">
        Loading settings…
      </div>
    );
  }

  return (
    <SettingsFormInner
      key={signature}
      initial={{
        name,
        smallBlind: fromCents(smallBlind),
        bigBlind: fromCents(bigBlind),
        defaultBuyIn: fromCents(defaultBuyIn),
      }}
    />
  );
}

function SettingsFormInner({ initial }: { initial: Draft }) {
  const saveSettings = useCash((s) => s.saveSettings);
  const resetGame = useCash((s) => s.resetGame);

  const [draft, setDraft] = useState<Draft>(initial);

  const dirty =
    draft.name !== initial.name ||
    draft.smallBlind !== initial.smallBlind ||
    draft.bigBlind !== initial.bigBlind ||
    draft.defaultBuyIn !== initial.defaultBuyIn;

  const canSave = dirty && draft.name.trim().length > 0;

  function save() {
    saveSettings(draft);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4 flex flex-col gap-4">
        <div>
          <div className="label">Cash Game Settings</div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            These only affect display and defaults. Players can always buy in
            for any amount.
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="label">Game name</span>
          <input
            className="input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Small blind</span>
            <NumberInput
              className="input font-mono"
              value={draft.smallBlind}
              onChange={(n) => setDraft({ ...draft, smallBlind: n })}
              step={0.01}
              min={0}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Big blind</span>
            <NumberInput
              className="input font-mono"
              value={draft.bigBlind}
              onChange={(n) => setDraft({ ...draft, bigBlind: n })}
              step={0.01}
              min={0}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="label">Default buy-in</span>
          <NumberInput
            className="input font-mono"
            value={draft.defaultBuyIn}
            onChange={(n) => setDraft({ ...draft, defaultBuyIn: n })}
            step={0.01}
            min={0}
          />
          <span className="text-[11px] text-[var(--text-muted)]">
            Pre-fills the buy-in dialog. Players can always override.
          </span>
        </label>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <span className="text-xs text-[var(--text-muted)]">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-col gap-2">
        <div className="label">Danger Zone</div>
        <div className="text-xs text-[var(--text-muted)]">
          Wipe all players, buy-ins, and cash-outs and start fresh.
        </div>
        <button
          className="btn btn-danger self-start mt-1"
          onClick={() => {
            if (
              confirm(
                "Reset the cash game? This clears every player and transaction.",
              )
            ) {
              resetGame();
            }
          }}
        >
          Reset cash game
        </button>
      </div>
    </div>
  );
}
