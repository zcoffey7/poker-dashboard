import { IconMinus, IconPlus } from "./icons";

/** "− count +" control for small whole-number tallies. */
export default function Stepper({
  value,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  decrementLabel,
  incrementLabel,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementLabel: string;
  incrementLabel: string;
}) {
  return (
    <div className="flex items-center rounded-[9px] border border-border-strong bg-surface">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon rounded-r-none"
        onClick={onDecrement}
        disabled={decrementDisabled}
        aria-label={decrementLabel}
      >
        <IconMinus />
      </button>
      <div className="w-8 text-center font-semibold tabular-nums">{value}</div>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon rounded-l-none"
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label={incrementLabel}
      >
        <IconPlus />
      </button>
    </div>
  );
}
