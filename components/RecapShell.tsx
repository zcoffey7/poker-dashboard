/**
 * Full-screen chrome shared by the tournament and cash recaps: header with
 * title/meta, a scrolling body, and the results table. The actions render
 * once: pinned to the bottom of the screen on phones, inline in the header
 * from `md` up.
 */
export default function RecapShell({
  eyebrow,
  title,
  meta,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  meta: React.ReactNode;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]"
        style={{
          background:
            "radial-gradient(700px 320px at 20% -60px, color-mix(in oklab, var(--gold) 14%, transparent), transparent 70%), radial-gradient(800px 360px at 90% -120px, var(--glow-1), transparent 70%)",
        }}
      />
      {/* No backdrop-filter here: it would trap the fixed phone action bar. */}
      <header className="relative flex-none border-b border-border bg-surface/70 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="label text-gold">{eyebrow}</div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate mt-0.5">
              {title}
            </h1>
            <div className="text-sm text-muted mt-1 tabular-nums">{meta}</div>
          </div>
          <div className="action-bar md:shrink-0">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 md:flex">
              {actions}
            </div>
          </div>
        </div>
      </header>
      <div className="relative flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto px-3 pt-4 pb-action-bar sm:px-6 sm:pt-7 md:pb-8 flex flex-col gap-6 sm:gap-7">
          {children}
        </div>
      </div>
    </div>
  );
}

export type RecapRow = {
  id: string;
  rank: string;
  name: string;
  /** Entries / add-ons summary, e.g. "2× · 1 add-on". */
  detail: string;
  played: string;
  moneyIn: string;
  moneyOut: string;
  net: string;
  netValue: number;
  /** Paid finishers get a gold rank badge. */
  highlight?: boolean;
};

const COLUMNS =
  "grid-cols-[3rem_minmax(0,1fr)_auto] sm:grid-cols-[4rem_minmax(0,1fr)_8rem_5.5rem_5rem_5rem_6rem]";

export function RecapTable({
  rows,
  rankLabel,
}: {
  rows: RecapRow[];
  rankLabel: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div
        className={`hidden sm:grid ${COLUMNS} gap-3 px-4 py-2.5 border-b border-border bg-surface-2/60 label`}
      >
        <span>{rankLabel}</span>
        <span>Player</span>
        <span>Buy-ins</span>
        <span className="text-right">Played</span>
        <span className="text-right">In</span>
        <span className="text-right">Out</span>
        <span className="text-right">Net</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`grid ${COLUMNS} items-center gap-3 px-3.5 sm:px-4 py-3 text-sm`}
          >
            <span
              className={`chip justify-center tabular-nums ${r.highlight ? "chip-gold" : ""}`}
            >
              {r.rank}
            </span>
            <div className="min-w-0">
              <div className="font-semibold sm:font-medium text-[0.9375rem] sm:text-sm truncate">
                {r.name}
              </div>
              <div className="sm:hidden text-xs text-muted tabular-nums leading-snug mt-0.5">
                {r.moneyIn} in · {r.moneyOut} out · {r.played}
              </div>
            </div>
            <span className="hidden sm:block text-muted tabular-nums truncate">
              {r.detail}
            </span>
            <span className="hidden sm:block text-right text-muted tabular-nums">
              {r.played}
            </span>
            <span className="hidden sm:block text-right tabular-nums">{r.moneyIn}</span>
            <span className="hidden sm:block text-right tabular-nums">{r.moneyOut}</span>
            <span
              className={`text-right text-base sm:text-sm font-semibold tabular-nums ${
                r.netValue > 0 ? "text-gain" : r.netValue < 0 ? "text-loss" : "text-muted"
              }`}
            >
              {r.net}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
