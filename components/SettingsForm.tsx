"use client";

import { useCallback, useMemo, useState } from "react";
import { useTournament } from "@/lib/store";
import type {
  BlindLevel,
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

type Draft = {
  general: GeneralDraft;
  tables: Table[];
  payouts: PayoutSpot[];
  blindStructure: BlindLevel[];
};

function snapshot(): Draft {
  const s = useTournament.getState();
  return {
    general: {
      name: s.name,
      startingStack: s.startingStack,
      buyIn: s.buyIn,
      rebuyChips: s.rebuyChips,
      addOnChips: s.addOnChips,
      addOnCost: s.addOnCost,
      settings: s.settings,
    },
    tables: s.tables.map((t) => ({ ...t })),
    payouts: s.payouts.map((p) => ({ ...p })),
    blindStructure: s.blindStructure.map((lv) => ({ ...lv })),
  };
}

/**
 * Outer wrapper. Subscribes to the handful of store fields that form the
 * "baseline" for the form and derives a stable `storedKey`. When an external
 * change (Save, Reset, Import JSON, another tab) updates the store, the key
 * changes and the inner form remounts with a fresh draft rather than relying
 * on a set-state-in-effect sync (which React 19 flags as impure).
 */
export default function SettingsForm() {
  const storedName = useTournament((s) => s.name);
  const storedTables = useTournament((s) => s.tables);
  const storedPayouts = useTournament((s) => s.payouts);
  const storedStructure = useTournament((s) => s.blindStructure);
  const storedSettings = useTournament((s) => s.settings);
  const storedStartingStack = useTournament((s) => s.startingStack);
  const storedBuyIn = useTournament((s) => s.buyIn);
  const storedRebuyChips = useTournament((s) => s.rebuyChips);
  const storedAddOnChips = useTournament((s) => s.addOnChips);
  const storedAddOnCost = useTournament((s) => s.addOnCost);

  const storedKey = useMemo(
    () =>
      JSON.stringify({
        name: storedName,
        startingStack: storedStartingStack,
        buyIn: storedBuyIn,
        rebuyChips: storedRebuyChips,
        addOnChips: storedAddOnChips,
        addOnCost: storedAddOnCost,
        settings: storedSettings,
        tables: storedTables,
        payouts: storedPayouts,
        blindStructure: storedStructure,
      }),
    [
      storedName,
      storedTables,
      storedPayouts,
      storedStructure,
      storedSettings,
      storedStartingStack,
      storedBuyIn,
      storedRebuyChips,
      storedAddOnChips,
      storedAddOnCost,
    ],
  );

  return <SettingsFormInner key={storedKey} baselineKey={storedKey} />;
}

function SettingsFormInner({ baselineKey }: { baselineKey: string }) {
  const saveSettings = useTournament((s) => s.saveSettings);

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

  function handleSave() {
    if (draft.tables.length === 0) {
      alert("You must have at least one table.");
      return;
    }
    if (draft.blindStructure.length === 0) {
      alert("You must have at least one blind level.");
      return;
    }
    const settings: TournamentSettings = { ...draft.general.settings };
    saveSettings({
      name: draft.general.name.trim() || "Tournament",
      startingStack: draft.general.startingStack,
      buyIn: draft.general.buyIn,
      rebuyChips: draft.general.rebuyChips,
      addOnChips: draft.general.addOnChips,
      addOnCost: draft.general.addOnCost,
      settings,
      tables: draft.tables,
      payouts: draft.payouts,
      blindStructure: draft.blindStructure,
    });
    // The store update bumps storedKey → parent remounts us with fresh state.
  }

  function handleDiscard() {
    setDraft(snapshot());
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
          addOnCost={draft.general.addOnCost}
          onChange={updatePayouts}
        />
      </div>
      <BlindStructureEditor
        structure={draft.blindStructure}
        onChange={updateStructure}
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
      className={`card-2 p-3 flex items-center gap-3 sticky top-[57px] z-10 border ${
        dirty
          ? "border-[var(--accent)]/60"
          : "border-[var(--border)]"
      }`}
    >
      <div className="flex-1 text-sm">
        {dirty ? (
          <span className="chip chip-amber">Unsaved changes</span>
        ) : (
          <span className="chip chip-green">All changes saved</span>
        )}
        <span className="text-[var(--text-muted)] ml-3 hidden md:inline">
          Changes in this form do not affect the dashboard until you save.
        </span>
      </div>
      <button
        className="btn btn-sm"
        onClick={onDiscard}
        disabled={!dirty}
      >
        Discard
      </button>
      <button
        className="btn btn-sm btn-primary"
        onClick={onSave}
        disabled={!dirty}
      >
        Save changes
      </button>
    </div>
  );
}
