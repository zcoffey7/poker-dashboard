"use client";

import type { Table } from "@/lib/types";
import { uid } from "@/lib/id";
import { confirmAction } from "@/lib/confirm";
import NumberInput from "./NumberInput";
import { Affixed, Section } from "./Section";
import { IconPlus, IconTrash } from "./icons";

type Props = {
  tables: Table[];
  onChange: (tables: Table[]) => void;
};

export default function TablesEditor({ tables, onChange }: Props) {
  function addTable() {
    const n = tables.length + 1;
    onChange([...tables, { id: uid("t"), name: `Table ${n}`, seatCount: 9 }]);
  }
  async function removeTable(t: Table) {
    if (tables.length <= 1) return;
    const ok = await confirmAction({
      title: `Remove ${t.name}?`,
      message: "Seated players become unseated when you save.",
      confirmLabel: "Remove table",
      tone: "danger",
    });
    if (ok) onChange(tables.filter((x) => x.id !== t.id));
  }
  function renameTable(id: string, name: string) {
    onChange(tables.map((t) => (t.id === id ? { ...t, name } : t)));
  }
  function setSeatCount(id: string, seatCount: number) {
    onChange(
      tables.map((t) =>
        t.id === id ? { ...t, seatCount: Math.max(2, seatCount) } : t,
      ),
    );
  }

  const active = tables.filter((t) => !t.broken).length;

  return (
    <Section
      title="Tables"
      description={`${tables.length} total · ${active} active`}
      actions={
        <button className="btn btn-sm" onClick={addTable}>
          <IconPlus />
          Table
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 ${t.broken ? "opacity-60" : ""}`}
          >
            <input
              className="input input-sm flex-1 min-w-0"
              value={t.name}
              aria-label={`Name for ${t.name}`}
              onChange={(e) => renameTable(t.id, e.target.value)}
            />
            {t.broken && <span className="chip chip-gold">Broken</span>}
            <div className="w-28 shrink-0">
              <Affixed suffix="seats">
                <NumberInput
                  className="input input-sm pr-12 tabular-nums"
                  value={t.seatCount}
                  min={2}
                  emptyValue={2}
                  aria-label={`Seat count for ${t.name}`}
                  onChange={(n) => setSeatCount(t.id, Math.max(2, n))}
                />
              </Affixed>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-icon hover:text-loss"
              onClick={() => removeTable(t)}
              disabled={tables.length <= 1}
              aria-label={`Remove ${t.name}`}
            >
              <IconTrash />
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}
