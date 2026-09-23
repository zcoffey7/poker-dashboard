import { LogoMark } from "@/components/Logo";
import ModeCards from "@/components/ModeCards";
import ThemePicker from "@/components/ThemePicker";
import { IconArrowRight, IconChart } from "@/components/icons";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 py-16">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-5">
        <ThemePicker />
      </div>
      <div className="w-full max-w-3xl flex flex-col gap-10">
        <header className="flex flex-col items-center text-center gap-5">
          <LogoMark className="size-16 shadow-[0_12px_40px_-12px_var(--primary)]" />
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
              <span className="text-primary">Poker</span>Clock
            </h1>
            <p className="text-muted mt-3 text-base sm:text-lg">
              Run your home game. Pick a mode to get started.
            </p>
          </div>
        </header>

        <ModeCards />

        <a
          href={`${basePath}/standings/`}
          className="card group flex items-center gap-4 px-5 py-4 transition-colors hover:border-gold/50"
        >
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-gold/12 text-gold text-lg ring-1 ring-gold/25">
            <IconChart />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold">Season standings</span>
            <span className="block text-sm text-muted truncate">
              Leaderboards, net P/L, and every session&apos;s history
            </span>
          </span>
          <IconArrowRight className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
        </a>
      </div>
    </div>
  );
}
