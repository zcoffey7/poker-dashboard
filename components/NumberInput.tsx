"use client";

import { useState } from "react";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "min" | "max" | "step"
> & {
  value: number;
  onChange: (n: number) => void;
  /** Value to commit when the field is left empty on blur. Defaults to 0. */
  emptyValue?: number;
  min?: number;
  max?: number;
  step?: number;
};

/**
 * Number input that lets the user fully clear the field while typing.
 *
 * Display is derived from focus state: while focused we render the user's
 * in-flight text so they can partially type (e.g. "1." or ""); while blurred
 * we render the parent's `value` formatted via String().
 *
 * On commit (blur), if the parsed number falls outside [min, max] it's
 * clamped. If `step` is provided it's rounded to the nearest multiple of
 * step (relative to min, if given). Unparseable values reset to `value`.
 */
export default function NumberInput({
  value,
  onChange,
  emptyValue = 0,
  min,
  max,
  step,
  onBlur,
  onFocus,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => String(value));

  const displayText = focused ? text : String(value);

  function clampAndStep(n: number): number {
    let out = n;
    // Only snap to step when step is a positive integer — fractional steps
    // (0.01, 0.5, …) suffer floating-point drift that'd corrupt user input.
    if (typeof step === "number" && step > 0 && Number.isInteger(step)) {
      const base = typeof min === "number" ? min : 0;
      out = base + Math.round((out - base) / step) * step;
    }
    if (typeof min === "number" && out < min) out = min;
    if (typeof max === "number" && out > max) out = max;
    return out;
  }

  return (
    <input
      {...rest}
      type="number"
      inputMode={rest.inputMode ?? "decimal"}
      min={min}
      max={max}
      step={step}
      value={displayText}
      onFocus={(e) => {
        setFocused(true);
        setText(String(value));
        onFocus?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next === "" || next === "-") return;
        const parsed = Number(next);
        if (!Number.isNaN(parsed)) onChange(parsed);
      }}
      onBlur={(e) => {
        setFocused(false);
        if (text === "" || text === "-") {
          onChange(emptyValue);
        } else {
          const parsed = Number(text);
          if (Number.isNaN(parsed)) {
            // fall back to current value — derived display will render it
          } else {
            const committed = clampAndStep(parsed);
            if (committed !== value) onChange(committed);
          }
        }
        onBlur?.(e);
      }}
    />
  );
}
