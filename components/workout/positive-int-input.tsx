"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "type"> & {
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
};

/**
 * Integer field with min; keeps typing natural (no forced leading zeros)
 * by buffering the raw string while focused.
 */
export function PositiveIntInput({
  value,
  onValueChange,
  min = 1,
  className,
  onFocus,
  onBlur,
  onChange,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => String(Math.max(min, value)));

  useEffect(() => {
    if (!focused) setDraft(String(Math.max(min, value)));
  }, [value, min, focused]);

  return (
    <Input
      {...rest}
      type="number"
      inputMode="numeric"
      min={min}
      className={className}
      value={focused ? draft : String(Math.max(min, value))}
      onFocus={(e) => {
        setFocused(true);
        setDraft(String(Math.max(min, value)));
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        const n = Number.parseInt(draft, 10);
        const next = Number.isFinite(n) && n >= min ? n : min;
        onValueChange(next);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw === "") return;
        const n = Number.parseInt(raw, 10);
        if (Number.isFinite(n) && n >= min) onValueChange(n);
        onChange?.(e);
      }}
    />
  );
}
