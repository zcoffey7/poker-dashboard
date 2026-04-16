"use client";

import { useTournament } from "@/lib/store";
import type { TournamentSettings } from "@/lib/types";
import NumberInput from "./NumberInput";

export type GeneralDraft = {
  name: string;
  startingStack: number;
  buyIn: number;
  rebuyChips: number;
  addOnChips: number;
  addOnCost: number;
  settings: TournamentSettings;
};

type Props = {
  draft: GeneralDraft;
  onChange: (patch: Partial<GeneralDraft>) => void;
};

export default function GeneralSettings({ draft, onChange }: Props) {
  const resetTournament = useTournament((s) => s.resetTournament);

  function updateSettings(patch: Partial<TournamentSettings>) {
    onChange({ settings: { ...draft.settings, ...patch } });
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="label">Tournament</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">Name</label>
          <input
            className="input"
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">
            Starting stack
          </label>
          <NumberInput
            className="input"
            value={draft.startingStack}
            onChange={(n) => onChange({ startingStack: n })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">Buy-in ($)</label>
          <NumberInput
            className="input"
            value={draft.buyIn}
            onChange={(n) => onChange({ buyIn: n })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">
            Rebuy chips (0 to disable)
          </label>
          <NumberInput
            className="input"
            value={draft.rebuyChips}
            onChange={(n) => onChange({ rebuyChips: n })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">
            Add-on chips (0 to disable)
          </label>
          <NumberInput
            className="input"
            value={draft.addOnChips}
            onChange={(n) => onChange({ addOnChips: n })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">
            Add-on cost ($)
          </label>
          <NumberInput
            className="input"
            value={draft.addOnCost}
            onChange={(n) => onChange({ addOnCost: n })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">
            Warning threshold (sec)
          </label>
          <NumberInput
            className="input"
            value={draft.settings.warnSec}
            onChange={(n) => updateSettings({ warnSec: n })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-muted)]">
            Seating mode
          </label>
          <select
            className="select"
            value={draft.settings.seatingMode}
            onChange={(e) =>
              updateSettings({
                seatingMode: e.target.value as "spread" | "fill",
              })
            }
          >
            <option value="spread">Spread (evenly across tables)</option>
            <option value="fill">Fill (fill first table first)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.settings.autoBalance}
            onChange={(e) =>
              updateSettings({ autoBalance: e.target.checked })
            }
          />
          Auto-balance tables on elimination
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.settings.soundEnabled}
            onChange={(e) =>
              updateSettings({ soundEnabled: e.target.checked })
            }
          />
          Sound alerts
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)] mt-2">
        <div className="flex-1" />
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            if (
              confirm(
                "Reset tournament to defaults? All players and progress will be lost. This takes effect immediately (no Save needed).",
              )
            ) {
              resetTournament();
            }
          }}
        >
          Reset to defaults
        </button>
      </div>
      <div className="text-xs text-[var(--text-muted)]">
        Reset applies immediately; other fields need Save.
      </div>
    </div>
  );
}
