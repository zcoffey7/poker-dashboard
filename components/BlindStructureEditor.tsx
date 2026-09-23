"use client";

import type { BlindLevel } from "@/lib/types";
import { newBlindLevelId } from "@/lib/blindLevelId";
import { confirmAction } from "@/lib/confirm";
import NumberInput from "./NumberInput";
import { Section } from "./Section";
import { IconArrowDown, IconArrowUp, IconCoffee, IconPlus, IconTrash } from "./icons";

type Props = {
  structure: BlindLevel[];
  onChange: (structure: BlindLevel[]) => void;
};

function renumber(levels: BlindLevel[]): BlindLevel[] {
  return levels.map((lv, i) => ({ ...lv, level: i + 1 }));
}

function MiniField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function BlindStructureEditor({ structure, onChange }: Props) {
  function updateLevel(index: number, patch: Partial<BlindLevel>) {
    onChange(
      structure.map((lv, i) => (i === index ? { ...lv, ...patch } : lv)),
    );
  }
  async function removeLevel(index: number) {
    const lv = structure[index];
    const ok = await confirmAction({
      title: `Remove level ${lv.level}${lv.isBreak ? " (break)" : ""}?`,
      message: "The levels after it are renumbered.",
      confirmLabel: "Remove level",
      tone: "danger",
    });
    if (!ok) return;
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
      id: newBlindLevelId(),
      level: (last?.level ?? 0) + 1,
      smallBlind: last ? last.smallBlind * 2 : 25,
      bigBlind: last ? last.bigBlind * 2 : 50,
      ante: last?.ante ?? 0,
      durationSec: last?.durationSec ?? 20 * 60,
      ...partial,
    };
    onChange([...structure, next]);
  }

  const totalMin = Math.round(
    structure.reduce((s, lv) => s + lv.durationSec, 0) / 60,
  );

  return (
    <Section
      title="Blind structure"
      description={`${structure.length} level${structure.length === 1 ? "" : "s"} · ${Math.floor(totalMin / 60)}h ${totalMin % 60}m total`}
      actions={
        <>
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
            <IconCoffee />
            Break
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => addLevel()}>
            <IconPlus />
            Level
          </button>
        </>
      }
    >
      {/* Phones: one compact card per level instead of a wide table. */}
      <ol className="sm:hidden flex flex-col gap-2">
        {structure.map((lv, i) => (
          <li
            key={lv.id}
            className={`card-2 px-3 pt-2 pb-3 flex flex-col gap-2 ${
              lv.isBreak ? "border-gold/35 bg-gold/[0.05]" : ""
            }`}
          >
            <div className="flex items-center gap-1">
              <span
                className={`flex-1 text-sm font-semibold ${lv.isBreak ? "text-gold" : ""}`}
              >
                {lv.isBreak ? (
                  <span className="inline-flex items-center gap-1.5">
                    <IconCoffee />
                    Break
                  </span>
                ) : (
                  `Level ${lv.level}`
                )}
              </span>
              <button
                className={`btn btn-ghost btn-xs btn-icon ${lv.isBreak ? "text-gold" : ""}`}
                onClick={() => updateLevel(i, { isBreak: !lv.isBreak })}
                aria-pressed={!!lv.isBreak}
                aria-label={`Level ${lv.level} is a break`}
              >
                <IconCoffee />
              </button>
              <button
                className="btn btn-ghost btn-xs btn-icon"
                onClick={() => moveLevel(i, -1)}
                disabled={i === 0}
                aria-label={`Move level ${lv.level} up`}
              >
                <IconArrowUp />
              </button>
              <button
                className="btn btn-ghost btn-xs btn-icon"
                onClick={() => moveLevel(i, 1)}
                disabled={i === structure.length - 1}
                aria-label={`Move level ${lv.level} down`}
              >
                <IconArrowDown />
              </button>
              <button
                className="btn btn-ghost btn-xs btn-icon hover:text-loss"
                onClick={() => removeLevel(i)}
                aria-label={`Remove level ${lv.level}`}
              >
                <IconTrash />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {!lv.isBreak && (
                <>
                  <MiniField label="SB">
                    <NumberInput
                      className="input input-sm px-2 tabular-nums"
                      value={lv.smallBlind}
                      aria-label={`Level ${lv.level} small blind`}
                      onChange={(n) => updateLevel(i, { smallBlind: n })}
                    />
                  </MiniField>
                  <MiniField label="BB">
                    <NumberInput
                      className="input input-sm px-2 tabular-nums"
                      value={lv.bigBlind}
                      aria-label={`Level ${lv.level} big blind`}
                      onChange={(n) => updateLevel(i, { bigBlind: n })}
                    />
                  </MiniField>
                  <MiniField label="Ante">
                    <NumberInput
                      className="input input-sm px-2 tabular-nums"
                      value={lv.ante}
                      aria-label={`Level ${lv.level} ante`}
                      onChange={(n) => updateLevel(i, { ante: n })}
                    />
                  </MiniField>
                </>
              )}
              <MiniField label="Min" className={lv.isBreak ? "col-start-4" : ""}>
                <NumberInput
                  className="input input-sm px-2 tabular-nums"
                  value={Math.round(lv.durationSec / 60)}
                  min={1}
                  emptyValue={1}
                  aria-label={`Level ${lv.level} duration in minutes`}
                  onChange={(n) =>
                    updateLevel(i, { durationSec: Math.max(1, n) * 60 })
                  }
                />
              </MiniField>
            </div>
          </li>
        ))}
      </ol>

      <div className="hidden sm:block overflow-x-auto scrollbar-thin -mx-5 px-5">
        <table className="w-full text-sm min-w-[600px] border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              <th className="label py-2 pl-2 pr-2 w-10">#</th>
              <th className="label py-2 pr-2">Small blind</th>
              <th className="label py-2 pr-2">Big blind</th>
              <th className="label py-2 pr-2">Ante</th>
              <th className="label py-2 pr-2">Minutes</th>
              <th className="label py-2 pr-2 text-center">Break</th>
              <th className="label py-2 pr-2 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {structure.map((lv, i) => (
              <tr
                key={lv.id}
                className={lv.isBreak ? "bg-gold/[0.06]" : "hover:bg-hover"}
              >
                <td className="py-1.5 pl-2 pr-2 border-t border-border tabular-nums text-muted font-medium rounded-l-lg">
                  {lv.level}
                </td>
                {lv.isBreak ? (
                  <td
                    colSpan={3}
                    className="py-1.5 pr-2 border-t border-border text-gold font-medium"
                  >
                    <span className="inline-flex items-center gap-2">
                      <IconCoffee />
                      Break
                    </span>
                  </td>
                ) : (
                  <>
                    <td className="py-1.5 pr-2 border-t border-border">
                      <NumberInput
                        className="input input-sm w-28 tabular-nums"
                        value={lv.smallBlind}
                        aria-label={`Level ${lv.level} small blind`}
                        onChange={(n) => updateLevel(i, { smallBlind: n })}
                      />
                    </td>
                    <td className="py-1.5 pr-2 border-t border-border">
                      <NumberInput
                        className="input input-sm w-28 tabular-nums"
                        value={lv.bigBlind}
                        aria-label={`Level ${lv.level} big blind`}
                        onChange={(n) => updateLevel(i, { bigBlind: n })}
                      />
                    </td>
                    <td className="py-1.5 pr-2 border-t border-border">
                      <NumberInput
                        className="input input-sm w-24 tabular-nums"
                        value={lv.ante}
                        aria-label={`Level ${lv.level} ante`}
                        onChange={(n) => updateLevel(i, { ante: n })}
                      />
                    </td>
                  </>
                )}
                <td className="py-1.5 pr-2 border-t border-border">
                  <NumberInput
                    className="input input-sm w-20 tabular-nums"
                    value={Math.round(lv.durationSec / 60)}
                    min={1}
                    emptyValue={1}
                    aria-label={`Level ${lv.level} duration in minutes`}
                    onChange={(n) =>
                      updateLevel(i, { durationSec: Math.max(1, n) * 60 })
                    }
                  />
                </td>
                <td className="py-1.5 pr-2 border-t border-border text-center">
                  <input
                    type="checkbox"
                    checked={!!lv.isBreak}
                    aria-label={`Level ${lv.level} is a break`}
                    onChange={(e) =>
                      updateLevel(i, { isBreak: e.target.checked })
                    }
                  />
                </td>
                <td className="py-1.5 pr-2 border-t border-border text-right rounded-r-lg">
                  <div className="inline-flex gap-0.5">
                    <button
                      className="btn btn-ghost btn-xs btn-icon"
                      onClick={() => moveLevel(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move level ${lv.level} up`}
                    >
                      <IconArrowUp />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs btn-icon"
                      onClick={() => moveLevel(i, 1)}
                      disabled={i === structure.length - 1}
                      aria-label={`Move level ${lv.level} down`}
                    >
                      <IconArrowDown />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs btn-icon hover:text-loss"
                      onClick={() => removeLevel(i)}
                      aria-label={`Remove level ${lv.level}`}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
