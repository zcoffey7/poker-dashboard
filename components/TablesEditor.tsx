"use client";

import type { Table } from "@/lib/types";
import NumberInput from "./NumberInput";

function uid() {
  return `t_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

type Props = {
  tables: Table[];
  onChange: (tables: Table[]) => void;
};

export default function TablesEditor({ tables, onChange }: Props) {
  function addTable() {
    const n = tables.length + 1;
    onChange([
      ...tables,
      { id: uid(), name: `Table ${n}`, seatCount: 9 },
    ]);
  }
  function removeTable(id: string) {
    if (tables.length <= 1) return;
    onChange(tables.filter((t) => t.id !== id));
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

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Tables</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            {tables.length} total ({tables.filter((t) => !t.broken).length}{" "}
            active)
          </div>
        </div>
        <button className="btn btn-sm btn-primary" onClick={addTable}>
          + Table
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 ${t.broken ? "opacity-50" : ""}`}
          >
            <input
              className="input !py-1 !text-sm flex-1"
              value={t.name}
              onChange={(e) => renameTable(t.id, e.target.value)}
            />
            <NumberInput
              className="input !py-1 !text-sm w-[80px]"
              value={t.seatCount}
              min={2}
              emptyValue={2}
              onChange={(n) => setSeatCount(t.id, Math.max(2, n))}
            />
            <span className="text-xs text-[var(--text-muted)]">
              seats
            </span>
            {t.broken && <span className="chip chip-amber">Broken</span>}
            <button
              className="btn btn-sm btn-danger"
              onClick={() => removeTable(t.id)}
              disabled={tables.length <= 1}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
