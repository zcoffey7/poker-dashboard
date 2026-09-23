/**
 * Shared stat-tile presentational components: one home for the label/value
 * markup and the gain/loss coloring used by the recaps, cash dialogs, and
 * dashboards.
 */

export type Tone = "gain" | "loss" | "muted" | "gold";

const TONE_CLASS: Record<Tone, string> = {
  gain: "text-gain",
  loss: "text-loss",
  muted: "text-muted",
  gold: "text-gold",
};

/** Green when up, red when down, neutral at exactly even. */
export function netTone(n: number): Tone | undefined {
  if (n > 0) return "gain";
  if (n < 0) return "loss";
  return undefined;
}

type StatProps = {
  label: string;
  value: string;
  tone?: Tone;
};

function toneClass(tone?: Tone) {
  return tone ? TONE_CLASS[tone] : "";
}

function StatLabel({ children }: { children: string }) {
  return (
    <div className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </div>
  );
}

/** Boxed tile used inside dialogs and modals. */
export function StatBox({ label, value, tone }: StatProps) {
  return (
    <div className="card-2 px-3 py-2.5">
      <StatLabel>{label}</StatLabel>
      <div className={`mt-0.5 text-[0.9375rem] font-semibold tabular-nums ${toneClass(tone)}`}>
        {value}
      </div>
    </div>
  );
}

/** Unboxed column used in recap winner cards and summary strips. */
export function StatCol({
  label,
  value,
  tone,
  emphasize,
  hint,
}: StatProps & { emphasize?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <StatLabel>{label}</StatLabel>
      <div
        className={`mt-0.5 tabular-nums truncate ${
          emphasize ? "text-lg font-semibold" : "text-sm font-medium"
        } ${toneClass(tone)}`}
      >
        {value}
      </div>
      {hint && <div className="text-[0.6875rem] text-muted tabular-nums">{hint}</div>}
    </div>
  );
}

/** Dashboard-level tile (full card) with an optional hint line. */
export function StatTile({
  label,
  value,
  hint,
  wide,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  /** When true, don't truncate the value (for wider tiles). */
  wide?: boolean;
  tone?: Tone;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card px-4 py-3 h-full min-w-0">
      <div className="flex items-center justify-between gap-2">
        <StatLabel>{label}</StatLabel>
        {icon && <span className="text-subtle text-sm">{icon}</span>}
      </div>
      <div
        className={`mt-1 text-xl font-semibold tabular-nums tracking-tight leading-tight ${
          wide ? "" : "truncate"
        } ${toneClass(tone)}`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted truncate">{hint}</div>}
    </div>
  );
}
