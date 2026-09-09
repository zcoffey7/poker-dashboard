/**
 * Shared stat-tile presentational components. One home for the label/value
 * markup and the sign/color logic that was previously copy-pasted across
 * GameRecap, CashRecap, CashOutDialog, CashPlayerDetailsModal, and
 * CashDashboardClient.
 */

type StatProps = {
  label: string;
  value: string;
  /**
   * true → accent (winning), false → muted (losing), null/undefined →
   * default text color.
   */
  positive?: boolean | null;
  muted?: boolean;
};

function valueColor(positive?: boolean | null, muted?: boolean): string {
  if (positive === true) return "text-[var(--accent)]";
  if (muted || positive === false) return "text-[var(--text-muted)]";
  return "";
}

function StatLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
      {children}
    </div>
  );
}

/** Boxed tile (card-2) used inside dialogs and modals. */
export function StatBox({ label, value, positive, muted }: StatProps) {
  return (
    <div className="card-2 p-2 rounded">
      <StatLabel>{label}</StatLabel>
      <div
        className={`font-mono text-sm font-semibold ${valueColor(positive, muted)}`}
      >
        {value}
      </div>
    </div>
  );
}

/** Unboxed column used in recap winner cards and summary strips. */
export function StatCol({
  label,
  value,
  positive,
  muted,
  emphasize,
  hint,
}: StatProps & { emphasize?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col">
      <StatLabel>{label}</StatLabel>
      <div
        className={`font-mono ${
          emphasize ? "text-base font-semibold" : "text-sm"
        } ${valueColor(positive, muted)}`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Compact column for dense participant rows. */
export function MiniStat({ label, value, positive, muted }: StatProps) {
  return (
    <div className="flex flex-col min-w-0">
      <StatLabel>{label}</StatLabel>
      <span
        className={`font-mono font-semibold truncate ${valueColor(positive, muted)}`}
      >
        {value}
      </span>
    </div>
  );
}

/** Dashboard-level tile (full card) with an optional hint line. */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-3">
      <StatLabel>{label}</StatLabel>
      <div className="text-lg font-semibold font-mono tabular-nums truncate">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-[var(--text-muted)] truncate">
          {hint}
        </div>
      )}
    </div>
  );
}
