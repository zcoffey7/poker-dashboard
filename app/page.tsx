import Link from "next/link";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            <span className="text-[var(--accent)]">Poker</span>Clock
          </h1>
          <p className="text-[var(--text-muted)] mt-2 text-sm sm:text-base">
            Pick a game mode to get started.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModeCard
            href="/tournament"
            title="Tournament"
            description="Timed blinds, seating, payouts, rebuys/add-ons, end-of-game recap."
            badge="Structured"
          />
          <ModeCard
            href="/cash"
            title="Cash Game"
            description="Fixed blinds, one table, unlimited rebuys for any amount, per-player cash-outs."
            badge="Casual"
          />
        </div>
        <div className="text-center">
          <a
            href={`${basePath}/standings/`}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            View season standings &raquo;
          </a>
        </div>
      </div>
    </div>
  );
}

type ModeCardProps = {
  href: string;
  title: string;
  description: string;
  badge: string;
};

function ModeCard({ href, title, description, badge }: ModeCardProps) {
  return (
    <Link
      href={href}
      className="card p-6 flex flex-col gap-3 hover:border-[var(--accent)] transition-colors group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xl font-semibold">{title}</div>
        <span className="chip chip-accent">{badge}</span>
      </div>
      <div className="text-sm text-[var(--text-muted)]">{description}</div>
      <div className="mt-auto pt-3 text-sm font-medium text-[var(--accent)] group-hover:translate-x-1 transition-transform">
        Open {title} &raquo;
      </div>
    </Link>
  );
}
