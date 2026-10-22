import Stepper from "./Stepper";
import { IconCrosshair } from "./icons";

function bountyNoun(count: number): string {
  return count === 1 ? "bounty" : "bounties";
}

/** Bounty tally badge; renders nothing until the player has won one. */
export function BountyChip({ count = 0 }: { count?: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="chip chip-gold tabular-nums shrink-0"
      title={`${count} ${bountyNoun(count)}`}
    >
      <IconCrosshair />
      {count}
      <span className="sr-only"> {bountyNoun(count)}</span>
    </span>
  );
}

/** A player's bounty count with − / + buttons. */
export function BountyRow({
  label,
  hint,
  playerName,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  playerName: string;
  value: number;
  onChange: (count: number) => void;
}) {
  return (
    <div className="card-2 flex items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        <div className="text-xs text-muted">{hint}</div>
      </div>
      <Stepper
        value={value}
        onDecrement={() => onChange(value - 1)}
        onIncrement={() => onChange(value + 1)}
        decrementDisabled={value <= 0}
        decrementLabel={`Remove a bounty from ${playerName}`}
        incrementLabel={`Add a bounty for ${playerName}`}
      />
    </div>
  );
}
