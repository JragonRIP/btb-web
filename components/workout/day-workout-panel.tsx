"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { DayType, PlanExercise, WeeklyWorkoutPlanRow } from "@/types";
import { recomputeStreaks } from "@/lib/streak";
import { formatExerciseMetaLine, normalizePlanExercise } from "@/lib/plan-exercise";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ActiveExerciseModal } from "@/components/workout/active-exercise-modal";

type LayoutMode = "page" | "embedded";

export function DayWorkoutPanel({
  dow,
  dateStr,
  layout,
}: {
  dow: number;
  dateStr: string;
  layout: LayoutMode;
}) {
  const { client: supabase } = useSupabaseBrowser();
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyWorkoutPlanRow | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [celebrate, setCelebrate] = useState(false);
  const [modalEx, setModalEx] = useState<PlanExercise | null>(null);

  const exercises = useMemo(() => (plan?.exercises ?? []) as PlanExercise[], [plan]);

  const load = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: row } = await supabase
      .from("weekly_workout_plan")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_of_week", dow)
      .maybeSingle();
    setPlan((row ?? null) as WeeklyWorkoutPlanRow | null);
    const raw = (row?.exercises ?? []) as PlanExercise[];
    const exs = raw.map((x, i) => (x.id ? normalizePlanExercise(x) : normalizePlanExercise({ ...x, id: `ex-${dow}-${i}` })));
    const initChk: Record<string, boolean> = {};
    for (const ex of exs) {
      initChk[ex.id] = false;
    }
    const { data: log } = await supabase
      .from("workout_logs")
      .select("exercises_done, completed")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .maybeSingle();
    if (log?.exercises_done && Array.isArray(log.exercises_done)) {
      for (const id of log.exercises_done as string[]) initChk[id] = true;
    }
    setChecked(initChk);
  }, [supabase, dow, dateStr]);

  useEffect(() => {
    void load();
  }, [load]);

  const dayType: DayType = (plan?.day_type as DayType) ?? "workout";
  const allChecked = exercises.length > 0 && exercises.every((ex) => checked[ex.id]);

  async function saveProgress(doneIds: string[], completed: boolean) {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase
      .from("workout_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .maybeSingle();
    const row = {
      user_id: user.id,
      date: dateStr,
      day_of_week: dow,
      exercises_done: doneIds,
      completed,
    };
    const { error } = existing?.id
      ? await supabase.from("workout_logs").update(row).eq("id", existing.id)
      : await supabase.from("workout_logs").insert(row);
    if (error) toast.error(error.message);
  }

  async function toggleEx(ex: PlanExercise) {
    const next = { ...checked, [ex.id]: !checked[ex.id] };
    setChecked(next);
    const doneIds = Object.entries(next).filter(([, v]) => v).map(([k]) => k);
    void saveProgress(doneIds, false);
  }

  async function completeWorkout() {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const doneIds = exercises.map((e) => e.id);
    await saveProgress(doneIds, true);
    await recomputeStreaks(supabase, user.id);
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 3200);
    toast.success("Workout complete!");
  }

  async function handleModalExerciseComplete(ex: PlanExercise): Promise<void> {
    const next = { ...checked, [ex.id]: true };
    setChecked(next);
    const doneIds = Object.entries(next).filter(([, v]) => v).map(([k]) => k);
    await saveProgress(doneIds, false);
    const allDone = exercises.length > 0 && exercises.every((e) => next[e.id]);
    if (allDone) await completeWorkout();
  }

  const pageHeader =
    layout === "page" ? (
      dayType === "full_rest" ? (
        <PageHeader title="Full rest" backHref="/workout" />
      ) : dayType === "active_rest" ? (
        <PageHeader title="Active rest" backHref="/workout" />
      ) : (
        <PageHeader title={format(parseISO(dateStr + "T12:00:00"), "EEEE")} subtitle="Workout" backHref="/workout" />
      )
    ) : null;

  if (!supabase) return null;

  if (dayType === "full_rest") {
    return (
      <div>
        {pageHeader}
        <div className={cn("mx-auto max-w-3xl px-4", layout === "embedded" ? "py-4" : "py-10")}>
          <Card className="p-8 text-center">
            <p className="font-display text-xl font-semibold text-ink">Full rest day</p>
            <p className="mt-3 text-muted">Recover well. You&apos;ve earned it.</p>
            {layout === "page" && (
              <Button type="button" className="mt-8 min-h-[48px]" variant="secondary" onClick={() => router.push("/workout")}>
                Back to plan
              </Button>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (dayType === "active_rest") {
    return (
      <div>
        {pageHeader}
        <div className={cn("mx-auto max-w-3xl px-4", layout === "embedded" ? "py-4" : "py-10")}>
          <Card className="p-8 text-center">
            <p className="font-display text-xl font-semibold text-ink">Active rest day</p>
            <p className="mt-3 text-muted">
              Your body grows on days like this. Go for a walk, stretch, or do something light.
            </p>
            {layout === "page" && (
              <Button type="button" className="mt-8 min-h-[48px]" variant="secondary" onClick={() => router.push("/workout")}>
                Back to plan
              </Button>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      {pageHeader}
      <ActiveExerciseModal
        open={modalEx != null}
        exercise={modalEx}
        onClose={() => setModalEx(null)}
        onExerciseComplete={(ex) => handleModalExerciseComplete(ex)}
      />
      <div className="relative mx-auto max-w-3xl space-y-4 px-4 py-6">
        {celebrate && (
          <div className="pointer-events-none fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className="btb-confetti-piece absolute left-1/2 top-1/3 h-3 w-2 rounded-sm bg-gold shadow-gold"
                style={
                  {
                    left: `${8 + (i * 37) % 86}%`,
                    top: `${18 + (i % 5) * 8}%`,
                    ["--tx" as string]: `${(i % 2 === 0 ? 1 : -1) * (30 + (i % 6) * 12)}px`,
                    ["--ty" as string]: `${140 + (i % 9) * 18}px`,
                    ["--rot" as string]: `${i * 33}deg`,
                    animationDelay: `${i * 45}ms`,
                  } as CSSProperties
                }
              />
            ))}
            <div className="relative z-10 rounded-2xl border border-gold bg-surface/95 px-10 py-8 text-center shadow-gold dark:bg-elevated/95">
              <p className="font-display text-3xl font-bold text-gold">Workout Complete!</p>
              <p className="mt-2 text-sm text-muted">Streak updates when nutrition goals are met too.</p>
            </div>
          </div>
        )}
        {!plan || exercises.length === 0 ? (
          <Card className="space-y-4 p-6 text-sm text-muted">
            <p>No exercises for this day.</p>
            <Link
              href="/workout/setup-flow"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gold px-4 text-center font-medium text-zinc-950 shadow-gold hover:brightness-110 dark:text-white"
            >
              Set up your week
            </Link>
          </Card>
        ) : (
          exercises.map((ex) => {
            const norm = normalizePlanExercise(ex);
            return (
              <Card key={ex.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label="Toggle complete"
                    className={cn(
                      "mt-1 flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border-2 transition",
                      checked[ex.id] ? "border-gold bg-gold/20 text-gold" : "border-line"
                    )}
                    onClick={() => void toggleEx(ex)}
                  >
                    {checked[ex.id] ? "✓" : ""}
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-xl py-1 text-left transition hover:bg-elevated/50 dark:hover:bg-surface/40"
                    disabled={checked[ex.id]}
                    onClick={() => {
                      if (checked[ex.id]) return;
                      setModalEx(norm);
                    }}
                  >
                    <p className="font-semibold text-ink">{ex.name}</p>
                    <p className="text-sm text-muted">{formatExerciseMetaLine(norm)}</p>
                    {!checked[ex.id] ? <p className="mt-1 text-xs font-medium text-gold">Tap to train</p> : null}
                  </button>
                </div>
              </Card>
            );
          })
        )}
        {exercises.length > 0 && (
          <Button type="button" className="min-h-[48px] w-full" disabled={!allChecked} onClick={() => void completeWorkout()}>
            Complete workout
          </Button>
        )}
      </div>
    </div>
  );
}
