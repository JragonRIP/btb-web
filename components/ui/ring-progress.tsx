"use client";

import { cn } from "@/lib/utils";

type RingProgressProps = {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  size?: number;
  stroke?: number;
  className?: string;
};

export function RingProgress({
  value,
  max,
  label,
  sublabel,
  size = 168,
  stroke = 14,
  className,
}: RingProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-line/20 dark:stroke-line/15"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-gold transition-[stroke-dasharray] duration-700 ease-out"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex min-h-[44px] flex-col items-center justify-center px-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-0.5 font-display text-lg font-bold leading-tight text-gold md:text-xl">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}
