"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanExercise } from "@/types";
import { exerciseKind } from "@/lib/plan-exercise";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

function vibrateShort() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([30, 40, 30]);
  } catch {
    /* ignore */
  }
}

type Ui =
  | { phase: "ready" }
  | { phase: "count"; v: 3 | 2 | 1 }
  | { phase: "go" }
  | { phase: "reps" }
  | { phase: "timed"; left: number }
  | { phase: "rest"; left: number };

export function ActiveExerciseModal({
  open,
  exercise,
  onClose,
  onExerciseComplete,
}: {
  open: boolean;
  exercise: PlanExercise | null;
  onClose: () => void;
  onExerciseComplete: (ex: PlanExercise) => void | Promise<void>;
}) {
  const [setIdx, setSetIdx] = useState(0);
  const setIdxRef = useRef(0);
  setIdxRef.current = setIdx;

  const [ui, setUi] = useState<Ui>({ phase: "ready" });
  const repsStartedRef = useRef<number>(0);
  const [, forceRepsTick] = useState(0);
  const restTimerRef = useRef<number | null>(null);
  const timedTimerRef = useRef<number | null>(null);

  const exerciseRef = useRef<PlanExercise | null>(null);
  exerciseRef.current = exercise;

  const clearTimers = () => {
    if (restTimerRef.current != null) {
      window.clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    if (timedTimerRef.current != null) {
      window.clearInterval(timedTimerRef.current);
      timedTimerRef.current = null;
    }
  };

  const reset = useCallback(() => {
    clearTimers();
    setSetIdx(0);
    setUi({ phase: "ready" });
    repsStartedRef.current = 0;
  }, []);

  useEffect(() => {
    if (!open || !exercise) reset();
  }, [open, exercise, reset]);

  useEffect(() => () => clearTimers(), []);

  const finishExercise = useCallback(() => {
    clearTimers();
    const ex = exerciseRef.current;
    if (!ex) {
      reset();
      onClose();
      return;
    }
    void Promise.resolve(onExerciseComplete(ex)).finally(() => {
      reset();
      onClose();
    });
  }, [onExerciseComplete, onClose, reset]);

  const afterRest = useCallback(() => {
    clearTimers();
    const ex = exerciseRef.current;
    if (!ex) return;
    const totalSets = Math.max(1, ex.sets);
    const idx = setIdxRef.current;
    if (idx < totalSets - 1) {
      setSetIdx(idx + 1);
      setUi({ phase: "ready" });
      return;
    }
    finishExercise();
  }, [finishExercise]);

  const afterRestRef = useRef(afterRest);
  afterRestRef.current = afterRest;

  const beginRest = useCallback(() => {
    clearTimers();
    const ex = exerciseRef.current;
    if (!ex) return;
    const restSec = Math.max(1, ex.restSeconds ?? 60);
    setUi({ phase: "rest", left: restSec });
    restTimerRef.current = window.setInterval(() => {
      setUi((prev) => {
        if (prev.phase !== "rest") return prev;
        if (prev.left <= 1) {
          if (restTimerRef.current != null) {
            window.clearInterval(restTimerRef.current);
            restTimerRef.current = null;
          }
          queueMicrotask(() => afterRestRef.current());
          return prev;
        }
        return { phase: "rest", left: prev.left - 1 };
      });
    }, 1000);
  }, []);

  const countStep = ui.phase === "count" ? ui.v : null;

  // 3-2-1 countdown
  useEffect(() => {
    if (!open || !exercise) return;
    if (ui.phase !== "count" || countStep == null) return;
    const t = window.setTimeout(() => {
      setUi((prev) => {
        if (prev.phase !== "count") return prev;
        if (prev.v === 3) return { phase: "count", v: 2 };
        if (prev.v === 2) return { phase: "count", v: 1 };
        return { phase: "go" };
      });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [open, exercise, ui.phase, countStep]);

  const beginRestRef = useRef(beginRest);
  beginRestRef.current = beginRest;

  // GO banner → active work
  useEffect(() => {
    if (!open || ui.phase !== "go") return;
    const ex = exerciseRef.current;
    if (!ex) return;
    const kind = exerciseKind(ex);
    const t = window.setTimeout(() => {
      if (kind === "reps") {
        repsStartedRef.current = Date.now();
        setUi({ phase: "reps" });
        return;
      }
      const duration = Math.max(1, ex.durationSeconds ?? 60);
      let left = duration;
      setUi({ phase: "timed", left });
      timedTimerRef.current = window.setInterval(() => {
        left -= 1;
        if (left <= 0) {
          if (timedTimerRef.current != null) {
            window.clearInterval(timedTimerRef.current);
            timedTimerRef.current = null;
          }
          vibrateShort();
          beginRestRef.current();
          return;
        }
        setUi({ phase: "timed", left });
      }, 1000);
    }, 650);
    return () => window.clearTimeout(t);
  }, [open, ui.phase]);

  // Reps: refresh elapsed display
  useEffect(() => {
    if (ui.phase !== "reps") return;
    const id = window.setInterval(() => forceRepsTick((x) => x + 1), 500);
    return () => window.clearInterval(id);
  }, [ui.phase]);

  if (!open || !exercise) return null;

  const kind = exerciseKind(exercise);
  const totalSets = Math.max(1, exercise.sets);
  const setLabel = `Set ${setIdx + 1} of ${totalSets}`;
  const duration = Math.max(1, exercise.durationSeconds ?? 60);
  const isFailure = kind === "reps" && Boolean(exercise.toFailure);
  const targetReps = Math.max(1, exercise.reps);
  const repsElapsed = ui.phase === "reps" ? Math.max(0, Math.floor((Date.now() - repsStartedRef.current) / 1000)) : 0;

  function startCountdown() {
    setUi({ phase: "count", v: 3 });
  }

  function skipRest() {
    clearTimers();
    afterRest();
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/92 text-ink backdrop-blur-md">
      <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
        <div className="min-w-[44px]" />
        <button
          type="button"
          aria-label="Close"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/80 hover:bg-white/10"
          onClick={() => {
            clearTimers();
            reset();
            onClose();
          }}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="font-display text-3xl font-semibold text-white md:text-4xl">{exercise.name}</p>
        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-white/60">{setLabel}</p>

        {ui.phase === "ready" && (
          <div className="mt-10 w-full max-w-sm space-y-8">
            {kind === "reps" ? (
              <p className="font-display text-5xl font-bold text-gold md:text-6xl">
                {isFailure ? "FAILURE" : `${targetReps} REPS`}
              </p>
            ) : (
              <p className={cn("font-mono text-6xl font-bold text-gold md:text-7xl tabular-nums")}>{formatClock(duration)}</p>
            )}
            <Button type="button" className="min-h-[52px] w-full text-lg" onClick={startCountdown}>
              {kind === "reps" ? "Start Set" : "Start"}
            </Button>
          </div>
        )}

        {ui.phase === "count" && (
          <div className="mt-16">
            <p className="font-display text-8xl font-bold text-gold">{ui.v}</p>
          </div>
        )}

        {ui.phase === "go" && (
          <div className="mt-16">
            <p className="font-display text-7xl font-bold text-white">GO!</p>
          </div>
        )}

        {ui.phase === "reps" && (
          <div className="mt-10 w-full max-w-sm space-y-8">
            <p className="text-sm uppercase tracking-wide text-white/60">Set in progress</p>
            <p className="font-mono text-5xl font-semibold text-white tabular-nums">{repsElapsed}s</p>
            <Button type="button" className="min-h-[52px] w-full text-lg" onClick={() => beginRest()}>
              Complete Set
            </Button>
          </div>
        )}

        {ui.phase === "timed" && (
          <div className="mt-10 w-full max-w-sm space-y-8">
            <p className={cn("font-mono text-7xl font-bold tabular-nums text-gold", "animate-pulse")}>{formatClock(ui.left)}</p>
          </div>
        )}

        {ui.phase === "rest" && (
          <div className="mt-10 w-full max-w-sm space-y-6">
            <p className="text-sm uppercase tracking-wide text-white/60">Rest</p>
            <p className="font-mono text-7xl font-bold tabular-nums text-gold">{formatClock(ui.left)}</p>
            <Button
              type="button"
              variant="secondary"
              className="min-h-[48px] w-full border-white/20 bg-white/10 text-white hover:bg-white/15"
              onClick={() => skipRest()}
            >
              Skip rest
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
