"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { DayType, PlanExercise, WeeklyWorkoutPlanRow } from "@/types";
import { recomputeStreaks } from "@/lib/streak";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const [restSec, setRestSec] = useState<Record<string, number>>({});
  const [timer, setTimer] = useState<{ exId: string; left: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const exercises = useMemo(() => (plan?.exercises ?? []) as PlanExercise[], [plan]);

  useEffect(() => {
    if (!timer) return;
    if (timer.left <= 0) {
      setTimer(null);
      return;
    }
    const id = setInterval(() => setTimer((t) => (t ? { ...t, left: t.left - 1 } : null)), 1000);
    return () => clearInterval(id);
  }, [timer]);

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
    const exs = raw.map((x, i) => (x.id ? x : { ...x, id: `ex-${dow}-${i}` }));
    const initRest: Record<string, number> = {};
    const initChk: Record<string, boolean> = {};
    for (const ex of exs) {
      initRest[ex.id] = ex.restSeconds ?? 60;
      initChk[ex.id] = false;
    }
    setRestSec(initRest);
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
    setTimeout(() => setCelebrate(false), 2500);
    toast.success("Workout complete!");
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
    <div className={cn(celebrate && "animate-pulse")}>
      {pageHeader}
      <div className="relative mx-auto max-w-3xl space-y-4 px-4 py-6">
        {celebrate && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <div className="rounded-2xl border border-gold bg-surface/95 px-8 py-6 font-display text-2xl font-bold text-gold shadow-gold">
              Crushed it!
            </div>
          </div>
        )}
        {!plan || exercises.length === 0 ? (
          <Card className="p-6 text-sm text-muted">
            No exercises for this day. Edit your weekly plan in Settings.
          </Card>
        ) : (
          exercises.map((ex) => (
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
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{ex.name}</p>
                  <p className="text-sm text-muted">
                    {ex.sets} × {ex.reps} · Rest {restSec[ex.id] ?? 60}s
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      className="h-11 min-h-[44px] w-24"
                      value={restSec[ex.id] ?? 60}
                      onChange={(e) =>
                        setRestSec((s) => ({
                          ...s,
                          [ex.id]: Math.max(10, Number(e.target.value) || 60),
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px]"
                      onClick={() => setTimer({ exId: ex.id, left: restSec[ex.id] ?? 60 })}
                    >
                      Start rest timer
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
        {timer && (
          <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-gold bg-surface px-8 py-6 shadow-gold dark:bg-elevated md:bottom-10">
            <p className="text-center text-xs text-muted">Rest</p>
            <p className="font-mono text-4xl font-bold text-gold">{timer.left}s</p>
          </div>
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
