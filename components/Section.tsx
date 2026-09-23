/** Settings-page building blocks: titled card sections and labelled fields. */

export function Section({
  title,
  description,
  actions,
  tone,
  className = "",
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: "danger";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={`card p-5 flex flex-col gap-4 min-w-0 ${
        tone === "danger" ? "border-loss/30" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2
            className={`font-semibold tracking-tight ${tone === "danger" ? "text-loss" : ""}`}
          >
            {title}
          </h2>
          {description && (
            <div className="text-sm text-muted mt-0.5">{description}</div>
          )}
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Label wrapping its control, so the association needs no ids. */
export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
      <span className="text-[0.8125rem] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </label>
  );
}

/** Positions a "$" / "%" / unit label inside an input's padding. */
export function Affixed({
  prefix,
  suffix,
  children,
}: {
  prefix?: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          {prefix}
        </span>
      )}
      {children}
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Switch-styled checkbox. Keeps native checkbox semantics for a11y. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border border-border-strong bg-surface-3 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-3.5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:border-transparent peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="block text-xs text-muted mt-0.5">{description}</span>
        )}
      </span>
    </label>
  );
}
