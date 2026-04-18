"use client";

import type { ChipColor, ChipDenom } from "@/lib/types";
import NumberInput from "./NumberInput";
import { CHIP_COLOR_MAP, CHIP_COLOR_OPTIONS, ChipDisk } from "./ChipLegend";

type Props = Readonly<{
  chipDenoms: ChipDenom[];
  onChange: (chipDenoms: ChipDenom[]) => void;
}>;

function newId() {
  return `c_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

export default function ChipDenomEditor({ chipDenoms, onChange }: Props) {
  function updateChip(id: string, patch: Partial<ChipDenom>) {
    onChange(chipDenoms.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function addChip() {
    const used = new Set(chipDenoms.map((c) => c.color));
    const nextColor: ChipColor =
      CHIP_COLOR_OPTIONS.find((o) => !used.has(o.value))?.value ?? "gray";
    const last = chipDenoms.at(-1);
    const nextValue = last ? Math.max(1, last.value) * 5 : 100;
    onChange([
      ...chipDenoms,
      { id: newId(), value: nextValue, color: nextColor },
    ]);
  }
  function removeChip(id: string) {
    onChange(chipDenoms.filter((c) => c.id !== id));
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Chip denominations</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            Shown on the dashboard so everyone knows each chip&apos;s value.
          </div>
        </div>
        <button className="btn btn-sm btn-primary" onClick={addChip}>
          + Chip
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {chipDenoms.length === 0 && (
          <div className="text-sm text-[var(--text-muted)] italic">
            No chips defined. Add one to show a legend on the dashboard.
          </div>
        )}
        {chipDenoms.map((c) => {
          const palette = CHIP_COLOR_MAP[c.color];
          return (
            <div key={c.id} className="flex items-center gap-2">
              <ChipDisk color={c.color} size={36} />
              <select
                className="select !py-1 !text-sm w-[120px]"
                value={c.color}
                onChange={(e) =>
                  updateChip(c.id, { color: e.target.value as ChipColor })
                }
                style={{
                  borderLeft: `4px solid ${palette.face}`,
                }}
              >
                {CHIP_COLOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <NumberInput
                className="input !py-1 !text-sm flex-1"
                value={c.value}
                min={0}
                onChange={(n) => updateChip(c.id, { value: n })}
              />
              <button
                className="btn btn-sm btn-danger"
                onClick={() => removeChip(c.id)}
                title="Remove chip"
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
