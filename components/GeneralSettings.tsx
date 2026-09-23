"use client";

import type { TournamentSettings } from "@/lib/types";
import NumberInput from "./NumberInput";
import { Affixed, Field, Section, Toggle } from "./Section";

export type GeneralDraft = {
  name: string;
  startingStack: number;
  buyIn: number;
  rebuyChips: number;
  rebuyCost: number;
  addOnChips: number;
  addOnCost: number;
  settings: TournamentSettings;
};

type Props = {
  draft: GeneralDraft;
  onChange: (patch: Partial<GeneralDraft>) => void;
};

export default function GeneralSettings({ draft, onChange }: Props) {
  function updateSettings(patch: Partial<TournamentSettings>) {
    onChange({ settings: { ...draft.settings, ...patch } });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Section
        title="Game"
        description="Name, entry, and how the dashboard behaves."
        className="lg:col-span-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" className="sm:col-span-2">
            <input
              className="input"
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </Field>
          <Field label="Buy-in">
            <Affixed prefix="$">
              <NumberInput
                className="input pl-7 tabular-nums"
                value={draft.buyIn}
                onChange={(n) => onChange({ buyIn: n })}
              />
            </Affixed>
          </Field>
          <Field label="Starting stack">
            <Affixed suffix="chips">
              <NumberInput
                className="input pr-14 tabular-nums"
                value={draft.startingStack}
                onChange={(n) => onChange({ startingStack: n })}
              />
            </Affixed>
          </Field>
          <Field label="Seating mode">
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
          </Field>
          <Field label="Warning threshold">
            <Affixed suffix="sec">
              <NumberInput
                className="input pr-12 tabular-nums"
                value={draft.settings.warnSec}
                onChange={(n) => updateSettings({ warnSec: n })}
              />
            </Affixed>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
          <Toggle
            checked={draft.settings.autoBalance}
            onChange={(v) => updateSettings({ autoBalance: v })}
            label="Auto-balance tables"
            description="Rebalance seats whenever a player is eliminated."
          />
          <Toggle
            checked={draft.settings.soundEnabled}
            onChange={(v) => updateSettings({ soundEnabled: v })}
            label="Sound alerts"
            description="Chime at the warning threshold and on level up."
          />
        </div>
      </Section>

      <Section
        title="Rebuys & add-ons"
        description="Set chips to 0 to turn either one off."
        className="lg:col-span-2"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Rebuy cost">
            <Affixed prefix="$">
              <NumberInput
                className="input pl-7 tabular-nums"
                value={draft.rebuyCost}
                onChange={(n) => onChange({ rebuyCost: n })}
              />
            </Affixed>
          </Field>
          <Field label="Rebuy chips">
            <NumberInput
              className="input tabular-nums"
              value={draft.rebuyChips}
              onChange={(n) => onChange({ rebuyChips: n })}
            />
          </Field>
          <Field label="Add-on cost">
            <Affixed prefix="$">
              <NumberInput
                className="input pl-7 tabular-nums"
                value={draft.addOnCost}
                onChange={(n) => onChange({ addOnCost: n })}
              />
            </Affixed>
          </Field>
          <Field label="Add-on chips">
            <NumberInput
              className="input tabular-nums"
              value={draft.addOnChips}
              onChange={(n) => onChange({ addOnChips: n })}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}
