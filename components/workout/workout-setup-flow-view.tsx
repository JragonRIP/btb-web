"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { DayType, PlanExercise, WeeklyWorkoutPlanRow } from "@/types";
import { MON_FIRST_DB_DOW } from "@/lib/week-dates";
import { normalizePlanExercise } from "@/lib/plan-exercise";
import { writeWeeklyPlanCache } from "@/lib/btb-local-cache";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExerciseInlineForm } from "@/components/workout/exercise-inline-form";
import { formatExerciseMetaLine } from "@/lib/plan-exercise";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

const MON_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MUSCLE_PRESETS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Other"] as const;

type Phase = "type" | "muscle" | "exercises" | "rest_ok" | "summary";

function monIndexToDbDow(i: number): number {
  return MON_FIRST_DB_DOW[i] ?? 1;
}

function emptyRow(userId: string, dow: number): WeeklyWorkoutPlanRow {
  return {
    user_id: userId,
    day_of_week: dow,
    muscle_group: null,
    day_type: "workout",
    exercises: [],
  };
}

async function upsertPlanDay(supabase: SupabaseClient, userId: string, row: WeeklyWorkoutPlanRow) {
  const payload = {
    user_id: userId,
    day_of_week: row.day_of_week,
    muscle_group: row.muscle_group ?? "",
    day_type: row.day_type,
    exercises: row.exercises.map((e) => normalizePlanExercise(e)),
  };
  const { error } = await supabase.from("weekly_workout_plan").upsert(payload, { onConflict: "user_id,day_of_week" });
  return error;
}

export function WorkoutSetupFlowView() {
  const { client: supabase } = useSupabaseBrowser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rowsByDow, setRowsByDow] = useState<Map<number, WeeklyWorkoutPlanRow>>(new Map());
  const [monIdx, setMonIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("type");
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const currentDow = monIndexToDbDow(monIdx);
  const currentRow = rowsByDow.get(currentDow) ?? (userId ? emptyRow(userId, currentDow) : null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data } = await supabase.from("weekly_workout_plan").select("*").eq("user_id", user.id);
    const map = new Map<number, WeeklyWorkoutPlanRow>();
    for (const raw of (data ?? []) as WeeklyWorkoutPlanRow[]) {
      map.set(raw.day_of_week, raw);
    }
    for (let i = 0; i < 7; i++) {
      const dow = monIndexToDbDow(i);
      if (!map.has(dow)) map.set(dow, emptyRow(user.id, dow));
    }
    setRowsByDow(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const weekList = useMemo(() => {
    return MON_FULL.map((name, i) => {
      const dow = monIndexToDbDow(i);
      const r = rowsByDow.get(dow);
      return { name, dow, row: r };
    });
  }, [rowsByDow]);

  function patchCurrent(patch: Partial<WeeklyWorkoutPlanRow>) {
    if (!userId) return;
    setRowsByDow((prev) => {
      const next = new Map(prev);
      const base = next.get(currentDow) ?? emptyRow(userId, currentDow);
      next.set(currentDow, { ...base, ...patch });
      return next;
    });
  }

  async function persistRow(row: WeeklyWorkoutPlanRow) {
    if (!supabase || !userId) return false;
    const err = await upsertPlanDay(supabase, userId, row);
    if (err) {
      toast.error(err.message);
      return false;
    }
    setRowsByDow((prev) => {
      const merged = new Map(prev);
      merged.set(row.day_of_week, row);
      const arr = Array.from(merged.values()).sort((a, b) => a.day_of_week - b.day_of_week);
      writeWeeklyPlanCache(userId, arr);
      return merged;
    });
    return true;
  }

  function selectDayType(t: DayType) {
    patchCurrent({ day_type: t });
    if (t === "workout") setPhase("muscle");
    else setPhase("rest_ok");
  }

  function selectMuscle(m: string) {
    patchCurrent({ muscle_group: m });
  }

  async function finishRestDay() {
    if (!currentRow || !userId) return;
    setBusy(true);
    const row: WeeklyWorkoutPlanRow = {
      ...currentRow,
      exercises: [],
      muscle_group: currentRow.muscle_group ?? "",
    };
    const ok = await persistRow(row);
    setBusy(false);
    if (!ok) return;
    if (monIdx >= 6) setPhase("summary");
    else {
      setMonIdx((i) => i + 1);
      setPhase("type");
      setShowExerciseForm(false);
      setEditingExId(null);
    }
  }

  async function finishWorkoutDay() {
    if (!currentRow || !userId) return;
    if (currentRow.exercises.length === 0) {
      toast.error("Add at least one exercise, or pick a rest day.");
      return;
    }
    setBusy(true);
    const row: WeeklyWorkoutPlanRow = {
      ...currentRow,
      muscle_group: currentRow.muscle_group ?? "",
      exercises: currentRow.exercises.map((e) => normalizePlanExercise(e)),
    };
    const ok = await persistRow(row);
    setBusy(false);
    if (!ok) return;
    if (monIdx >= 6) setPhase("summary");
    else {
      setMonIdx((i) => i + 1);
      setPhase("type");
      setShowExerciseForm(false);
      setEditingExId(null);
    }
  }

  async function skipRemaining() {
    if (!supabase || !userId) return;
    setBusy(true);
    const merged = new Map(rowsByDow);
    for (let i = monIdx + 1; i < 7; i++) {
      const dow = monIndexToDbDow(i);
      const base = merged.get(dow) ?? emptyRow(userId, dow);
      const row: WeeklyWorkoutPlanRow = {
        ...base,
        day_type: "workout",
        muscle_group: "",
        exercises: [],
      };
      const err = await upsertPlanDay(supabase, userId, row);
      if (err) {
        toast.error(err.message);
        setBusy(false);
        return;
      }
      merged.set(dow, row);
    }
    setRowsByDow(merged);
    writeWeeklyPlanCache(
      userId,
      Array.from(merged.values()).sort((a, b) => a.day_of_week - b.day_of_week)
    );
    setBusy(false);
    setPhase("summary");
  }

  function goBack() {
    if (phase === "summary") return;
    if (phase === "exercises") {
      setShowExerciseForm(false);
      setEditingExId(null);
      setPhase("muscle");
      return;
    }
    if (phase === "muscle") {
      setPhase("type");
      return;
    }
    if (phase === "rest_ok") {
      setPhase("type");
      return;
    }
    if (phase === "type" && monIdx > 0) {
      const nextIdx = monIdx - 1;
      const prevDow = monIndexToDbDow(nextIdx);
      const prev = rowsByDow.get(prevDow);
      const dt = (prev?.day_type as DayType) ?? "workout";
      setMonIdx(nextIdx);
      setShowExerciseForm(false);
      setEditingExId(null);
      if (dt === "workout") setPhase((prev?.exercises?.length ?? 0) > 0 ? "exercises" : "muscle");
      else setPhase("rest_ok");
    } else if (phase === "type" && monIdx === 0) {
      router.push("/workout");
    }
  }

  const dayTitle = MON_FULL[monIdx];
  const exercises = (currentRow?.exercises ?? []) as PlanExercise[];
  const addingOpen = showExerciseForm && !editingExId;

  if (!supabase || loading || !userId || !currentRow) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted">Loading…</div>;
  }

  if (phase === "summary") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-canvas">
        <div className="border-b border-line/80 px-4 pb-4 pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)]">
          <h1 className="text-center font-display text-2xl font-semibold text-ink">Your week is set up!</h1>
          <p className="mt-2 text-center text-sm text-muted">Here&apos;s your plan at a glance.</p>
        </div>
        <div className="mx-auto w-full max-w-lg flex-1 space-y-3 px-4 py-8">
          {weekList.map(({ name, dow, row }) => {
            const dt = (row?.day_type as DayType) ?? "workout";
            const badge =
              dt === "workout"
                ? "Workout"
                : dt === "active_rest"
                  ? "Active rest"
                  : "Full rest";
            const exn = (row?.exercises ?? []).length;
            return (
              <Card key={dow} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">{name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {dt === "workout" ? (
                        <>
                          {(row?.muscle_group ?? "").trim() || "Muscle TBD"} · {exn} exercise{exn === 1 ? "" : "s"}
                        </>
                      ) : (
                        badge
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">{badge}</span>
                </div>
              </Card>
            );
          })}
          <Button type="button" className="mt-6 min-h-[48px] w-full" onClick={() => router.push("/workout")}>
            Let&apos;s go
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/95 px-2 pb-3 pt-[calc(max(env(safe-area-inset-top,0px),12px)+4px)] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink hover:bg-elevated"
            onClick={goBack}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">Day {monIdx + 1} of 7</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/30">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300"
                style={{ width: `${((monIdx + 1) / 7) * 100}%` }}
              />
            </div>
          </div>
          <div className="min-w-[44px]" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-6">
        {phase === "type" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-semibold text-ink">{dayTitle}</h1>
              <p className="mt-2 text-sm text-muted">What kind of day is this?</p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                className="w-full min-h-[44px] rounded-2xl border border-line bg-surface p-5 text-left shadow-soft transition hover:border-gold/40 dark:bg-elevated"
                onClick={() => selectDayType("workout")}
              >
                <p className="font-display text-xl font-semibold text-ink">
                  Workout <span aria-hidden>💪</span>
                </p>
                <p className="mt-1 text-sm text-muted">Training day</p>
              </button>
              <button
                type="button"
                className="w-full min-h-[44px] rounded-2xl border border-line bg-surface p-5 text-left shadow-soft transition hover:border-gold/40 dark:bg-elevated"
                onClick={() => selectDayType("active_rest")}
              >
                <p className="font-display text-xl font-semibold text-ink">
                  Active Rest <span aria-hidden>🚶</span>
                </p>
                <p className="mt-1 text-sm text-muted">Light activity, walk, stretch</p>
              </button>
              <button
                type="button"
                className="w-full min-h-[44px] rounded-2xl border border-line bg-surface p-5 text-left shadow-soft transition hover:border-gold/40 dark:bg-elevated"
                onClick={() => selectDayType("full_rest")}
              >
                <p className="font-display text-xl font-semibold text-ink">
                  Full Rest <span aria-hidden>😴</span>
                </p>
                <p className="mt-1 text-sm text-muted">Total recovery</p>
              </button>
            </div>
            <Button type="button" variant="ghost" className="min-h-[48px] w-full text-muted" disabled={busy} onClick={() => void skipRemaining()}>
              Skip remaining days
            </Button>
          </div>
        )}

        {phase === "muscle" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">What are you training?</h1>
              <p className="mt-2 text-sm text-muted">{dayTitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MUSCLE_PRESETS.map((m) => {
                const sel = (currentRow.muscle_group ?? "").trim() === m;
                return (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      "min-h-[48px] rounded-full border px-3 py-3 text-sm font-semibold transition",
                      sel ? "border-gold bg-gold/15 text-gold" : "border-line bg-surface text-ink dark:bg-elevated"
                    )}
                    onClick={() => selectMuscle(m)}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              className="min-h-[48px] w-full"
              disabled={!(currentRow.muscle_group ?? "").trim()}
              onClick={() => setPhase("exercises")}
            >
              Continue
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px] w-full text-muted" disabled={busy} onClick={() => void skipRemaining()}>
              Skip remaining days
            </Button>
          </div>
        )}

        {phase === "exercises" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink">Add your exercises for {dayTitle}</h1>
              <p className="mt-2 text-sm text-muted">{(currentRow.muscle_group ?? "").trim()}</p>
            </div>
            <div className="space-y-3">
              {exercises.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted">No exercises yet. Tap below to add your first.</Card>
              ) : (
                exercises.map((ex) => (
                  <Card key={ex.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{ex.name}</p>
                        <p className="text-sm text-muted">{formatExerciseMetaLine(normalizePlanExercise(ex))}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="min-h-[44px]"
                          onClick={() => {
                            setEditingExId(ex.id);
                            setShowExerciseForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] text-red-600"
                          onClick={() => {
                            patchCurrent({ exercises: exercises.filter((e) => e.id !== ex.id) });
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {editingExId === ex.id && showExerciseForm ? (
                      <div className="mt-4">
                        <ExerciseInlineForm
                          initial={ex}
                          submitLabel="Save"
                          onCancel={() => {
                            setShowExerciseForm(false);
                            setEditingExId(null);
                          }}
                          onSubmit={(next) => {
                            patchCurrent({ exercises: exercises.map((e) => (e.id === ex.id ? normalizePlanExercise(next) : e)) });
                            setShowExerciseForm(false);
                            setEditingExId(null);
                          }}
                        />
                      </div>
                    ) : null}
                  </Card>
                ))
              )}
            </div>
            {addingOpen ? (
              <ExerciseInlineForm
                initial={null}
                onCancel={() => setShowExerciseForm(false)}
                onSubmit={(ex) => {
                  patchCurrent({ exercises: [...exercises, normalizePlanExercise(ex)] });
                  setShowExerciseForm(false);
                }}
              />
            ) : null}
            <div className="flex flex-col gap-3">
              {!addingOpen ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[48px] w-full"
                  onClick={() => {
                    setEditingExId(null);
                    setShowExerciseForm(true);
                  }}
                >
                  {exercises.length ? "Add another exercise" : "Add exercise"}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" className="min-h-[48px] w-full" disabled={busy} onClick={() => void finishWorkoutDay()}>
                Finish Day
              </Button>
              <Button type="button" variant="ghost" className="min-h-[48px] w-full text-muted" disabled={busy} onClick={() => void skipRemaining()}>
                Skip remaining days
              </Button>
            </div>
          </div>
        )}

        {phase === "rest_ok" && (
          <div className="space-y-6">
            <h1 className="font-display text-2xl font-semibold text-ink">Confirm your day</h1>
            <Card className="p-6 text-center">
              <p className="font-display text-xl font-semibold text-ink">
                {currentRow.day_type === "active_rest" ? "Active rest" : "Full rest"}
              </p>
              <p className="mt-3 text-sm text-muted">
                {currentRow.day_type === "active_rest"
                  ? "Light movement, mobility, and easy walking are perfect here."
                  : "Total recovery — let your nervous system recharge."}
              </p>
            </Card>
            <Button type="button" className="min-h-[48px] w-full" disabled={busy} onClick={() => void finishRestDay()}>
              Confirm and continue
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px] w-full text-muted" disabled={busy} onClick={() => void skipRemaining()}>
              Skip remaining days
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
