"use client";

import { useCallback, useMemo, useState } from "react";
import { useTournament } from "@/lib/store";
import { useHasHydrated } from "@/lib/useHasHydrated";
import { confirmAction, showNotice } from "@/lib/confirm";
import type {
  BlindLevel,
  ChipDenom,
  PayoutSpot,
  Table,
  TournamentSettings,
} from "@/lib/types";
import GeneralSettings, {
  type GeneralDraft,
} from "./GeneralSettings";
import TablesEditor from "./TablesEditor";
import PayoutsEditor from "./PayoutsEditor";
import BlindStructureEditor from "./BlindStructureEditor";
import ChipDenomEditor from "./ChipDenomEditor";
import SheetSyncCard from "./standings/SheetSyncCard";
import { Section } from "./Section";
import { IconCheck } from "./icons";

type Draft = {
  general: GeneralDraft;
  tables: Table[];
  payouts: PayoutSpot[];
  blindStructure: BlindLevel[];
  chipDenoms: ChipDenom[];
};

function snapshot(): Draft {
  const s = useTournament.getState();
  return {
    general: {
      name: s.name,
      startingStack: s.startingStack,
      buyIn: s.buyIn,
      rebuyChips: s.rebuyChips,
      rebuyCost: s.rebuyCost,
      addOnChips: s.addOnChips,
      addOnCost: s.addOnCost,
      settings: s.settings,
    },
    tables: s.tables.map((t) => ({ ...t })),
    payouts: s.payouts.map((p) => ({ ...p })),
    blindStructure: s.blindStructure.map((lv) => ({ ...lv })),
    chipDenoms: s.chipDenoms.map((c) => ({ ...c })),
  };
}

/**
 * Outer wrapper. Subscribes to the handful of store fields that form the
 * "baseline" for the form and derives a stable `storedKey`. When an external
 * change (Save, Reset) updates the store, the key changes and the inner form
 * remounts with a fresh draft rather than relying on a set-state-in-effect
 * sync (which React 19 flags as impure).
 */
export default function SettingsForm() {
  // Zustand's `persist` middleware rehydrates the store from localStorage on
  // the client, so the server render (no localStorage → defaults) never
  // matches the client render (persisted values). Gate the whole form behind
  // the store's own hydration signal so React sees identical output on the
  // server and the first client render, then swaps in the real form once the
  // persisted values are in.
  const hydrated = useHasHydrated(useTournament);

  const storedName = useTournament((s) => s.name);
  const storedTables = useTournament((s) => s.tables);
  const storedPayouts = useTournament((s) => s.payouts);
  const storedStructure = useTournament((s) => s.blindStructure);
  const storedChipDenoms = useTournament((s) => s.chipDenoms);
  const storedSettings = useTournament((s) => s.settings);
  const storedStartingStack = useTournament((s) => s.startingStack);
  const storedBuyIn = useTournament((s) => s.buyIn);
  const storedRebuyChips = useTournament((s) => s.rebuyChips);
  const storedRebuyCost = useTournament((s) => s.rebuyCost);
  const storedAddOnChips = useTournament((s) => s.addOnChips);
  const storedAddOnCost = useTournament((s) => s.addOnCost);

  // Must match the `Draft` shape exactly — `dirty` detection compares
  // `JSON.stringify(draft)` against this string, and a mismatched shape would
  // make the form permanently look "unsaved" after every save.
  const storedKey = useMemo(
    () =>
      JSON.stringify({
        general: {
          name: storedName,
          startingStack: storedStartingStack,
          buyIn: storedBuyIn,
          rebuyChips: storedRebuyChips,
          rebuyCost: storedRebuyCost,
          addOnChips: storedAddOnChips,
          addOnCost: storedAddOnCost,
          settings: storedSettings,
        },
        tables: storedTables,
        payouts: storedPayouts,
        blindStructure: storedStructure,
        chipDenoms: storedChipDenoms,
      }),
    [
      storedName,
      storedTables,
      storedPayouts,
      storedStructure,
      storedChipDenoms,
      storedSettings,
      storedStartingStack,
      storedBuyIn,
      storedRebuyChips,
      storedRebuyCost,
      storedAddOnChips,
      storedAddOnCost,
    ],
  );

  if (!hydrated) {
    return (
      <div className="card p-6 text-sm text-muted" aria-busy="true">
        Loading settings…
      </div>
    );
  }

  return <SettingsFormInner key={storedKey} baselineKey={storedKey} />;
}

function SettingsFormInner({ baselineKey }: { baselineKey: string }) {
  const saveSettings = useTournament((s) => s.saveSettings);
  const resetTournament = useTournament((s) => s.resetTournament);

  // Initialize from the current store snapshot. Because the parent remounts us
  // whenever `baselineKey` changes, we can treat `baselineKey` as an immutable
  // baseline for "dirty" detection without a separate useState cell.
  const [draft, setDraft] = useState<Draft>(() => snapshot());

  const dirty = useMemo(
    () => JSON.stringify(draft) !== baselineKey,
    [draft, baselineKey],
  );

  const updateGeneral = useCallback(
    (patch: Partial<GeneralDraft>) =>
      setDraft((d) => ({ ...d, general: { ...d.general, ...patch } })),
    [],
  );
  const updateTables = useCallback(
    (tables: Table[]) => setDraft((d) => ({ ...d, tables })),
    [],
  );
  const updatePayouts = useCallback(
    (payouts: PayoutSpot[]) => setDraft((d) => ({ ...d, payouts })),
    [],
  );
  const updateStructure = useCallback(
    (blindStructure: BlindLevel[]) =>
      setDraft((d) => ({ ...d, blindStructure })),
    [],
  );
  const updateChipDenoms = useCallback(
    (chipDenoms: ChipDenom[]) => setDraft((d) => ({ ...d, chipDenoms })),
    [],
  );

  function handleSave() {
    if (draft.tables.length === 0) {
      void showNotice("You must have at least one table.");
      return;
    }
    if (draft.blindStructure.length === 0) {
      void showNotice("You must have at least one blind level.");
      return;
    }
    const settings: TournamentSettings = { ...draft.general.settings };
    saveSettings({
      name: draft.general.name.trim() || "Tournament",
      startingStack: draft.general.startingStack,
      buyIn: draft.general.buyIn,
      rebuyChips: draft.general.rebuyChips,
      rebuyCost: draft.general.rebuyCost,
      addOnChips: draft.general.addOnChips,
      addOnCost: draft.general.addOnCost,
      settings,
      tables: draft.tables,
      payouts: draft.payouts,
      blindStructure: draft.blindStructure,
      chipDenoms: draft.chipDenoms,
    });
    // The store update bumps storedKey → parent remounts us with fresh state.
  }

  function handleDiscard() {
    setDraft(snapshot());
  }

  async function handleReset() {
    const ok = await confirmAction({
      title: "Reset tournament to defaults?",
      message:
        "All players and progress will be lost. This takes effect immediately — no Save needed.",
      confirmLabel: "Reset tournament",
      tone: "danger",
    });
    if (ok) resetTournament();
  }

  return (
    <div className="flex flex-col gap-4">
      <SaveBar dirty={dirty} onSave={handleSave} onDiscard={handleDiscard} />
      <GeneralSettings draft={draft.general} onChange={updateGeneral} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TablesEditor tables={draft.tables} onChange={updateTables} />
        <PayoutsEditor
          payouts={draft.payouts}
          buyIn={draft.general.buyIn}
          rebuyCost={draft.general.rebuyCost}
          addOnCost={draft.general.addOnCost}
          onChange={updatePayouts}
        />
      </div>
      <ChipDenomEditor
        chipDenoms={draft.chipDenoms}
        onChange={updateChipDenoms}
      />
      <BlindStructureEditor
        structure={draft.blindStructure}
        onChange={updateStructure}
      />
      <SheetSyncCard />
      <Section
        title="Danger zone"
        description="Reset clears every player and restores the default structure. It applies immediately."
        tone="danger"
        actions={
          <button className="btn btn-danger" onClick={handleReset}>
            Reset to defaults
          </button>
        }
      />
    </div>
  );
}

function SaveBar({
  dirty,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      className={`sticky top-[calc(3.5rem+1px)] z-10 card px-4 py-3 flex items-center gap-3 backdrop-blur-md bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] transition-colors ${
        dirty ? "border-gold/50" : ""
      }`}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3 text-sm">
        {dirty ? (
          <span className="chip chip-gold">
            Unsaved<span className="hidden sm:inline"> changes</span>
          </span>
        ) : (
          <span className="chip chip-primary">
            <IconCheck />
            <span className="sm:hidden">Saved</span>
            <span className="hidden sm:inline">All changes saved</span>
          </span>
        )}
        <span className="text-muted hidden md:inline truncate">
          Changes here don&apos;t affect the dashboard until you save.
        </span>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onDiscard} disabled={!dirty}>
        Discard
      </button>
      <button className="btn btn-sm btn-primary" onClick={onSave} disabled={!dirty}>
        Save<span className="hidden sm:inline"> changes</span>
      </button>
    </div>
  );
}
