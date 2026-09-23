"use client";

import type { ChipColor, ChipDenom } from "@/lib/types";
import { uid } from "@/lib/id";
import { confirmAction } from "@/lib/confirm";
import { CHIP_COLOR_MAP, CHIP_COLOR_OPTIONS, ChipDisk } from "./ChipLegend";
import { chipImageForValue } from "@/lib/chipImages";
import { Section } from "./Section";
import { IconPlus, IconTrash } from "./icons";

type Props = Readonly<{
  chipDenoms: ChipDenom[];
  onChange: (chipDenoms: ChipDenom[]) => void;
}>;

export default function ChipDenomEditor({ chipDenoms, onChange }: Props) {
  function updateChipColor(id: string, color: ChipColor) {
    const taken = new Set(
      chipDenoms.filter((c) => c.id !== id).map((c) => c.color),
    );
    if (taken.has(color)) return;
    const preset = CHIP_COLOR_OPTIONS.find((o) => o.value === color);
    onChange(
      chipDenoms.map((c) =>
        c.id === id
          ? { ...c, color, value: preset?.chipValue ?? c.value }
          : c,
      ),
    );
  }
  function addChip() {
    const used = new Set(chipDenoms.map((c) => c.color));
    const next = CHIP_COLOR_OPTIONS.find((o) => !used.has(o.value));
    if (!next) return;
    onChange([
      ...chipDenoms,
      { id: uid("c"), value: next.chipValue, color: next.value },
    ]);
  }
  async function removeChip(c: ChipDenom) {
    const ok = await confirmAction({
      title: `Remove the $${c.value.toLocaleString()} chip?`,
      confirmLabel: "Remove chip",
      tone: "danger",
    });
    if (ok) onChange(chipDenoms.filter((d) => d.id !== c.id));
  }

  const allPresetsUsed =
    new Set(chipDenoms.map((c) => c.color)).size >= CHIP_COLOR_OPTIONS.length;

  return (
    <Section
      title="Chip denominations"
      description="Shown on the dashboard so everyone knows each chip's value."
      actions={
        <button
          className="btn btn-sm"
          onClick={addChip}
          disabled={allPresetsUsed}
          title={
            allPresetsUsed
              ? "Every Monte Carlo chip is already in use"
              : "Add a chip"
          }
        >
          <IconPlus />
          Chip
        </button>
      }
    >
      {chipDenoms.length === 0 && (
        <div className="text-sm text-muted italic">
          No chips defined. Add one to show a legend on the dashboard.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {chipDenoms.map((c) => {
          const palette = CHIP_COLOR_MAP[c.color];
          const imageSrc = chipImageForValue(c.value);
          const takenByOthers = new Set(
            chipDenoms.filter((d) => d.id !== c.id).map((d) => d.color),
          );
          return (
            <div key={c.id} className="card-2 flex items-center gap-3 p-2.5 pr-2">
              <ChipDisk
                color={c.color}
                size="2.75rem"
                imageSrc={imageSrc}
                imageAlt={`$${c.value.toLocaleString()} chip`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold tabular-nums text-lg leading-tight">
                  ${c.value.toLocaleString()}
                </div>
                <select
                  className="select input-sm mt-1 max-w-[13rem]"
                  value={c.color}
                  aria-label={`Color for $${c.value.toLocaleString()} chip`}
                  onChange={(e) =>
                    updateChipColor(c.id, e.target.value as ChipColor)
                  }
                  style={{ borderLeft: `3px solid ${palette.face}` }}
                >
                  {CHIP_COLOR_OPTIONS.map((o) => (
                    <option
                      key={o.value}
                      value={o.value}
                      disabled={takenByOthers.has(o.value)}
                    >
                      {o.label}
                      {takenByOthers.has(o.value) ? " (in use)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-ghost btn-sm btn-icon hover:text-loss"
                onClick={() => removeChip(c)}
                aria-label={`Remove $${c.value.toLocaleString()} chip`}
              >
                <IconTrash />
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
