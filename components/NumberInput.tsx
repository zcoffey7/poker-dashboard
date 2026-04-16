"use client";

import { useEffect, useRef, useState } from "react";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number;
  onChange: (n: number) => void;
  /** Value to commit when the field is left empty on blur. Defaults to 0. */
  emptyValue?: number;
};

/**
 * Number input that lets the user fully clear the field while typing.
 *
 * Problem: a naive controlled number input with `+e.target.value || 0` forces
 * the field to "0" as soon as it's empty, making it impossible to backspace
 * and type a new number cleanly.
 *
 * This component keeps a local string so the field can be empty mid-edit.
 * Parent onChange is only called when the text parses as a valid number.
 * On blur, if still empty, we commit `emptyValue` (default 0).
 */
export default function NumberInput({
  value,
  onChange,
  emptyValue = 0,
  onBlur,
  ...rest
}: Props) {
  const [text, setText] = useState(() => String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current && String(value) !== text) {
      setText(String(value));
    }
  }, [value, text]);

  return (
    <input
      {...rest}
      type="number"
      value={text}
      onFocus={(e) => {
        focused.current = true;
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next === "" || next === "-") return;
        const parsed = Number(next);
        if (!Number.isNaN(parsed)) onChange(parsed);
      }}
      onBlur={(e) => {
        focused.current = false;
        if (text === "" || text === "-" || Number.isNaN(Number(text))) {
          setText(String(emptyValue));
          onChange(emptyValue);
        }
        onBlur?.(e);
      }}
    />
  );
}
