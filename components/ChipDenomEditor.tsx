"use client";

import type { ChipColor, ChipDenom } from "@/lib/types";
import { CHIP_COLOR_MAP, CHIP_COLOR_OPTIONS, ChipDisk } from "./ChipLegend";
import { chipImageForValue } from "@/lib/chipImages";

type Props = Readonly<{
  chipDenoms: ChipDenom[];
  onChange: (chipDenoms: ChipDenom[]) => void;
}>;

function newId() {
  return `c_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

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
      { id: newId(), value: next.chipValue, color: next.value },
    ]);
  }
  function removeChip(id: string) {
    onChange(chipDenoms.filter((c) => c.id !== id));
  }

  const allPresetsUsed =
    new Set(chipDenoms.map((c) => c.color)).size >= CHIP_COLOR_OPTIONS.length;

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Chip denominations</div>
          <div className="text-sm text-muted mt-1">
            Shown on the dashboard so everyone knows each chip&apos;s value.
          </div>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={addChip}
          disabled={allPresetsUsed}
          title={
            allPresetsUsed
              ? "Every Monte Carlo chip is already in use"
              : "Add a chip"
          }
        >
          + Chip
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {chipDenoms.length === 0 && (
          <div className="text-sm text-muted italic">
            No chips defined. Add one to show a legend on the dashboard.
          </div>
        )}
        {chipDenoms.map((c) => {
          const palette = CHIP_COLOR_MAP[c.color];
          const imageSrc = chipImageForValue(c.value);
          const takenByOthers = new Set(
            chipDenoms.filter((d) => d.id !== c.id).map((d) => d.color),
          );
          return (
            <div key={c.id} className="flex items-center gap-4">
              <ChipDisk
                color={c.color}
                size={64}
                imageSrc={imageSrc}
                imageAlt={`$${c.value.toLocaleString()} chip`}
              />
              {/* Wrap the select in a fixed-width container: the global
                  `.select { width: 100% }` rule outranks Tailwind width
                  utilities here, so without the wrapper the dropdown would
                  stretch across the row. */}
              <div className="w-[220px] shrink-0">
                <select
                  className="select"
                  value={c.color}
                  aria-label={`Color for $${c.value.toLocaleString()} chip`}
                  onChange={(e) =>
                    updateChipColor(c.id, e.target.value as ChipColor)
                  }
                  style={{
                    borderLeft: `4px solid ${palette.face}`,
                  }}
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
              <div className="flex-1 font-mono tabular-nums text-lg font-semibold">
                ${c.value.toLocaleString()}
              </div>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  if (confirm(`Remove the $${c.value.toLocaleString()} chip?`))
                    removeChip(c.id);
                }}
                aria-label={`Remove $${c.value.toLocaleString()} chip`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
