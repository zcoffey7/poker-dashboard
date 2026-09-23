"use client";

import { useState } from "react";
import { useCash } from "@/lib/cashStore";
import { fromCents } from "@/lib/money";
import { useHasHydrated } from "@/lib/useHasHydrated";
import { confirmAction } from "@/lib/confirm";
import NumberInput from "../NumberInput";
import SheetSyncCard from "../standings/SheetSyncCard";
import { Affixed, Field, Section } from "../Section";
import { IconCheck } from "../icons";

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
      <div className="card p-5 text-sm text-muted" aria-busy="true">
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

  const blindsInvalid = draft.bigBlind < draft.smallBlind;
  const canSave = dirty && draft.name.trim().length > 0 && !blindsInvalid;

  function save() {
    saveSettings(draft);
  }

  async function handleReset() {
    const ok = await confirmAction({
      title: "Reset the cash game?",
      message: "This clears every player, buy-in, and cash-out.",
      confirmLabel: "Reset cash game",
      tone: "danger",
    });
    if (ok) resetGame();
  }

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Game"
        description="These only affect display and defaults."
      >
        <Field label="Game name">
          <input
            className="input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Small blind">
            <Affixed prefix="$">
              <NumberInput
                className="input pl-7 tabular-nums"
                value={draft.smallBlind}
                onChange={(n) => setDraft({ ...draft, smallBlind: n })}
                step={0.01}
                min={0}
              />
            </Affixed>
          </Field>
          <Field label="Big blind">
            <Affixed prefix="$">
              <NumberInput
                className="input pl-7 tabular-nums"
                value={draft.bigBlind}
                onChange={(n) => setDraft({ ...draft, bigBlind: n })}
                step={0.01}
                min={0}
              />
            </Affixed>
          </Field>
        </div>

        <Field
          label="Default buy-in"
          hint="Pre-fills the buy-in dialog. Players can always override."
        >
          <Affixed prefix="$">
            <NumberInput
              className="input pl-7 tabular-nums"
              value={draft.defaultBuyIn}
              onChange={(n) => setDraft({ ...draft, defaultBuyIn: n })}
              step={0.01}
              min={0}
            />
          </Affixed>
        </Field>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <span
            className={`text-sm inline-flex items-center gap-1.5 ${
              blindsInvalid ? "text-warn" : dirty ? "text-gold" : "text-muted"
            }`}
          >
            {blindsInvalid ? (
              "Big blind must be at least the small blind."
            ) : dirty ? (
              "Unsaved changes"
            ) : (
              <>
                <IconCheck />
                All changes saved
              </>
            )}
          </span>
          <button className="btn btn-primary" onClick={save} disabled={!canSave}>
            Save
          </button>
        </div>
      </Section>

      <SheetSyncCard />

      <Section
        title="Danger zone"
        description="Wipe all players, buy-ins, and cash-outs and start fresh."
        tone="danger"
        actions={
          <button className="btn btn-danger" onClick={handleReset}>
            Reset cash game
          </button>
        }
      />
    </div>
  );
}
