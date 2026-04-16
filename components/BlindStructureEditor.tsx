"use client";

import type { BlindLevel } from "@/lib/types";
import NumberInput from "./NumberInput";

type Props = {
  structure: BlindLevel[];
  onChange: (structure: BlindLevel[]) => void;
};

function renumber(levels: BlindLevel[]): BlindLevel[] {
  return levels.map((lv, i) => ({ ...lv, level: i + 1 }));
}

export default function BlindStructureEditor({ structure, onChange }: Props) {
  function updateLevel(index: number, patch: Partial<BlindLevel>) {
    onChange(
      structure.map((lv, i) => (i === index ? { ...lv, ...patch } : lv)),
    );
  }
  function removeLevel(index: number) {
    onChange(renumber(structure.filter((_, i) => i !== index)));
  }
  function moveLevel(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= structure.length) return;
    const arr = structure.slice();
    [arr[index], arr[j]] = [arr[j], arr[index]];
    onChange(renumber(arr));
  }
  function addLevel(partial?: Partial<BlindLevel>) {
    const last = structure[structure.length - 1];
    const next: BlindLevel = {
      level: (last?.level ?? 0) + 1,
      smallBlind: last ? last.smallBlind * 2 : 25,
      bigBlind: last ? last.bigBlind * 2 : 50,
      ante: last?.ante ?? 0,
      durationSec: last?.durationSec ?? 20 * 60,
      ...partial,
    };
    onChange([...structure, next]);
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Blind Structure</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            {structure.length} level{structure.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-sm"
            onClick={() =>
              addLevel({
                isBreak: true,
                smallBlind: 0,
                bigBlind: 0,
                ante: 0,
                durationSec: 10 * 60,
              })
            }
          >
            + Break
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => addLevel()}
          >
            + Level
          </button>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[620px]">
          <thead>
            <tr className="text-left text-[var(--text-muted)] text-xs uppercase">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">SB</th>
              <th className="py-2 pr-2 font-medium">BB</th>
              <th className="py-2 pr-2 font-medium">Ante</th>
              <th className="py-2 pr-2 font-medium">Min</th>
              <th className="py-2 pr-2 font-medium">Break</th>
              <th className="py-2 pr-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {structure.map((lv, i) => (
              <tr
                key={i}
                className={`border-t border-[var(--border)] ${lv.isBreak ? "bg-[var(--surface2)]" : ""}`}
              >
                <td className="py-1.5 pr-2 font-mono">{lv.level}</td>
                <td className="py-1.5 pr-2">
                  <NumberInput
                    className="input !py-1 !text-sm w-[90px]"
                    value={lv.smallBlind}
                    disabled={lv.isBreak}
                    onChange={(n) => updateLevel(i, { smallBlind: n })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <NumberInput
                    className="input !py-1 !text-sm w-[90px]"
                    value={lv.bigBlind}
                    disabled={lv.isBreak}
                    onChange={(n) => updateLevel(i, { bigBlind: n })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <NumberInput
                    className="input !py-1 !text-sm w-[80px]"
                    value={lv.ante}
                    disabled={lv.isBreak}
                    onChange={(n) => updateLevel(i, { ante: n })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <NumberInput
                    className="input !py-1 !text-sm w-[70px]"
                    value={Math.round(lv.durationSec / 60)}
                    min={1}
                    emptyValue={1}
                    onChange={(n) =>
                      updateLevel(i, { durationSec: Math.max(1, n) * 60 })
                    }
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="checkbox"
                    checked={!!lv.isBreak}
                    onChange={(e) =>
                      updateLevel(i, { isBreak: e.target.checked })
                    }
                  />
                </td>
                <td className="py-1.5 pr-2 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      className="btn btn-sm btn-ghost !px-2"
                      onClick={() => moveLevel(i, -1)}
                      disabled={i === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="btn btn-sm btn-ghost !px-2"
                      onClick={() => moveLevel(i, 1)}
                      disabled={i === structure.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-sm btn-danger !px-2"
                      onClick={() => removeLevel(i)}
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
