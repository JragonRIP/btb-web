"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { easeOutCubic, prefersReducedMotion } from "@/lib/motion";

const RING_MS = 1000;

type RingProgressProps = {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  animateIntro?: boolean;
  introKey?: number;
  countMaxLabel?: string;
  countMode?: "kcal" | "g";
  size?: number;
  stroke?: number;
  className?: string;
};

export function RingProgress({
  value,
  max,
  label,
  sublabel,
  animateIntro = false,
  introKey = 0,
  countMaxLabel,
  countMode = "kcal",
  size = 168,
  stroke = 14,
  className,
}: RingProgressProps) {
  const pctLive = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const [easeT, setEaseT] = useState(1);
  const [displayVal, setDisplayVal] = useState(0);
  const [frozenPct, setFrozenPct] = useState(0);
  const [ringIntroActive, setRingIntroActive] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const snapRef = useRef({ value, max });
  snapRef.current = { value, max };

  useLayoutEffect(() => {
    if (!animateIntro || introKey === 0) {
      setRingIntroActive(false);
      setEaseT(1);
      setDisplayVal(snapRef.current.value);
      return;
    }

    const { value: snapVal, max: snapM } = snapRef.current;
    const snapMax = snapM > 0 ? snapM : 1;
    const snapPct = snapMax > 0 ? Math.min(100, Math.max(0, (snapVal / snapMax) * 100)) : 0;

    if (prefersReducedMotion()) {
      setRingIntroActive(false);
      return;
    }

    setRingIntroActive(true);
    setEaseT(0);
    setDisplayVal(0);
    setFrozenPct(snapPct);
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / RING_MS);
      const e = easeOutCubic(t);
      setEaseT(e);
      setDisplayVal(snapVal * e);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setRingIntroActive(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [animateIntro, introKey]);

  const dash = ringIntroActive ? (frozenPct / 100) * c * easeT : (pctLive / 100) * c;

  const maxLbl = countMaxLabel ?? sublabel.split("/").pop()?.trim() ?? "—";

  const animatedSublabel =
    countMode === "g"
      ? maxLbl === "—"
        ? `${Math.round(displayVal)}g / —`
        : `${Math.round(displayVal)}g / ${maxLbl}g`
      : `${Math.round(displayVal)} / ${maxLbl}`;

  const showSublabel = ringIntroActive ? animatedSublabel : sublabel;

  const emptyRing = max > 0 && value <= 0;
  const wantsIntro = Boolean(animateIntro && introKey > 0);
  const introFinished = wantsIntro && !ringIntroActive && easeT >= 1;
  const pulseTrack = emptyRing && (!wantsIntro || introFinished);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className={cn("stroke-line/20 dark:stroke-line/15", pulseTrack && "btb-ring-empty-pulse")}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-gold"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex min-h-[44px] flex-col items-center justify-center px-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-0.5 font-display text-lg font-bold leading-tight text-gold md:text-xl">{showSublabel}</p>
        </div>
      </div>
    </div>
  );
}
