import { IconSpade } from "./icons";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[28%] text-primary-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] ${className}`}
      style={{
        background:
          "linear-gradient(140deg, var(--primary-hover), var(--primary) 50%, color-mix(in oklab, var(--primary) 55%, var(--gold)))",
      }}
    >
      <IconSpade size="58%" />
    </span>
  );
}

export default function Logo({ markClassName }: { markClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={markClassName} />
      <span className="font-semibold text-[1.0625rem] tracking-tight">
        <span className="text-primary">Poker</span>Clock
      </span>
    </span>
  );
}
