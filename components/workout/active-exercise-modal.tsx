"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const finishExerciseRef = useRef(finishExercise);
  finishExerciseRef.current = finishExercise;

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
    finishExerciseRef.current();
  }, []);

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

  const beginRestRef = useRef(beginRest);
  beginRestRef.current = beginRest;

  function completeRepsSetOrFinish() {
    const ex = exerciseRef.current;
    if (!ex) return;
    const total = Math.max(1, ex.sets);
    if (setIdxRef.current >= total - 1) finishExerciseRef.current();
    else beginRestRef.current();
  }

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
          const total = Math.max(1, ex.sets);
          if (setIdxRef.current >= total - 1) finishExerciseRef.current();
          else beginRestRef.current();
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

  function skipRest() {
    clearTimers();
    afterRestRef.current();
  }

  if (!open || !exercise) return null;
  if (!mounted || typeof document === "undefined") return null;

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

  const overlay = (
    <div
      className="pointer-events-auto fixed inset-0 z-[9999] flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-black/95 text-ink backdrop-blur-md"
      style={{ width: "100vw", left: 0, top: 0 }}
    >
      <div className="flex shrink-0 items-center justify-between px-3 pt-[max(env(safe-area-inset-top,0px),10px)]">
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

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-[max(env(safe-area-inset-bottom,0px),12px)] pt-2 text-center">
        <p className="line-clamp-2 max-w-[min(100%,20rem)] font-display text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
          {exercise.name}
        </p>
        <p className="mt-2 shrink-0 text-xs font-medium uppercase tracking-wide text-white/60 sm:text-sm">{setLabel}</p>

        <div className="mt-4 flex min-h-0 w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 overflow-hidden py-2">
          {ui.phase === "ready" && (
            <div className="flex w-full flex-col items-center gap-5">
              {kind === "reps" ? (
                <p className="font-display text-4xl font-bold leading-none text-gold sm:text-5xl md:text-6xl">
                  {isFailure ? "FAILURE" : `${targetReps} REPS`}
                </p>
              ) : (
                <p className="font-mono text-5xl font-bold tabular-nums text-gold sm:text-6xl md:text-7xl">{formatClock(duration)}</p>
              )}
              <Button type="button" className="min-h-[52px] w-full max-w-sm shrink-0 text-lg" onClick={startCountdown}>
                {kind === "reps" ? "Start Set" : "Start"}
              </Button>
            </div>
          )}

          {ui.phase === "count" && (
            <p className="font-display text-7xl font-bold leading-none text-gold sm:text-8xl">{ui.v}</p>
          )}

          {ui.phase === "go" && <p className="font-display text-6xl font-bold text-white sm:text-7xl">GO!</p>}

          {ui.phase === "reps" && (
            <div className="flex w-full flex-col items-center gap-5">
              <p className="text-xs uppercase tracking-wide text-white/60 sm:text-sm">Set in progress</p>
              <p className="font-mono text-4xl font-semibold tabular-nums text-white sm:text-5xl">{repsElapsed}s</p>
              <Button type="button" className="min-h-[52px] w-full max-w-sm shrink-0 text-lg" onClick={completeRepsSetOrFinish}>
                Complete Set
              </Button>
            </div>
          )}

          {ui.phase === "timed" && (
            <p className={cn("font-mono text-5xl font-bold tabular-nums text-gold sm:text-7xl", "animate-pulse")}>{formatClock(ui.left)}</p>
          )}

          {ui.phase === "rest" && (
            <div className="flex w-full flex-col items-center gap-4">
              <p className="text-xs uppercase tracking-wide text-white/60 sm:text-sm">Rest</p>
              <p className="font-mono text-5xl font-bold tabular-nums text-gold sm:text-7xl">{formatClock(ui.left)}</p>
              <Button
                type="button"
                variant="secondary"
                className="min-h-[48px] w-full max-w-sm shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/15"
                onClick={() => skipRest()}
              >
                Skip rest
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
