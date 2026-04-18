"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { DayType, PlanExercise, WeeklyWorkoutPlanRow } from "@/types";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { writeWeeklyPlanCache } from "@/lib/btb-local-cache";

const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function newExercise(): PlanExercise {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: "Exercise",
    sets: 3,
    reps: 10,
    restSeconds: 60,
  };
}

export function WeeklyEditorView({ backHref = "/settings" }: { backHref?: string }) {
  const { client: supabase } = useSupabaseBrowser();
  const router = useRouter();
  const [rows, setRows] = useState<WeeklyWorkoutPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const { data } = await supabase.from("weekly_workout_plan").select("*").eq("user_id", user.id);
    const list = (data ?? []) as WeeklyWorkoutPlanRow[];
    if (list.length === 0) {
      const seed: WeeklyWorkoutPlanRow[] = Array.from({ length: 7 }, (_, day_of_week) => ({
        id: "",
        user_id: user.id,
        day_of_week,
        muscle_group: "General",
        day_type: "workout" as DayType,
        exercises: [newExercise()],
      }));
      setRows(seed);
    } else {
      setRows(list.sort((a, b) => a.day_of_week - b.day_of_week));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateRow(dow: number, patch: Partial<WeeklyWorkoutPlanRow>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === dow ? { ...r, ...patch } : r)));
  }

  function updateExercises(dow: number, exercises: PlanExercise[]) {
    updateRow(dow, { exercises });
  }

  async function saveAll() {
    if (!supabase) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    for (const r of rows) {
      const payload = {
        user_id: user.id,
        day_of_week: r.day_of_week,
        muscle_group: r.muscle_group ?? "",
        day_type: r.day_type,
        exercises: r.exercises,
      };
      const { error } = await supabase.from("weekly_workout_plan").upsert(payload, {
        onConflict: "user_id,day_of_week",
      });
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }
    writeWeeklyPlanCache(user.id, rows);
    toast.success("Weekly plan saved");
    setSaving(false);
    router.push(backHref);
    router.refresh();
  }

  if (!supabase) return null;

  return (
    <div>
      <PageHeader title="Edit weekly workouts" backHref={backHref} />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          rows
            .slice()
            .sort((a, b) => a.day_of_week - b.day_of_week)
            .map((r) => (
              <Card key={r.day_of_week} className="space-y-4 p-4">
                <p className="font-display text-lg font-semibold text-ink">{DOW_LABEL[r.day_of_week]}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Day type</Label>
                    <Select
                      value={r.day_type}
                      onChange={(e) => updateRow(r.day_of_week, { day_type: e.target.value as DayType })}
                    >
                      <option value="workout">Workout</option>
                      <option value="active_rest">Active rest</option>
                      <option value="full_rest">Full rest</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Muscle group</Label>
                    <Input
                      value={r.muscle_group ?? ""}
                      onChange={(e) => updateRow(r.day_of_week, { muscle_group: e.target.value })}
                    />
                  </div>
                </div>
                {r.day_type === "workout" && (
                  <div className="space-y-3">
                    <Label>Exercises</Label>
                    {(r.exercises as PlanExercise[]).map((ex, idx) => (
                      <div key={ex.id} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,5.5rem)_auto] sm:items-end">
                        <div className="min-w-0 sm:col-span-1">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Exercise name</p>
                          <Input
                            className="min-h-[44px] min-w-0"
                            placeholder="Bench press"
                            value={ex.name}
                            onChange={(e) => {
                              const next = [...(r.exercises as PlanExercise[])];
                              next[idx] = { ...ex, name: e.target.value };
                              updateExercises(r.day_of_week, next);
                            }}
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Sets</p>
                          <Input
                            type="number"
                            className="min-h-[44px] w-full"
                            value={ex.sets}
                            onChange={(e) => {
                              const next = [...(r.exercises as PlanExercise[])];
                              next[idx] = { ...ex, sets: Number(e.target.value) || 0 };
                              updateExercises(r.day_of_week, next);
                            }}
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Reps</p>
                          <Input
                            type="number"
                            className="min-h-[44px] w-full"
                            value={ex.reps}
                            onChange={(e) => {
                              const next = [...(r.exercises as PlanExercise[])];
                              next[idx] = { ...ex, reps: Number(e.target.value) || 0 };
                              updateExercises(r.day_of_week, next);
                            }}
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Rest (sec)</p>
                          <Input
                            type="number"
                            className="min-h-[44px] w-full"
                            value={ex.restSeconds}
                            onChange={(e) => {
                              const next = [...(r.exercises as PlanExercise[])];
                              next[idx] = { ...ex, restSeconds: Number(e.target.value) || 60 };
                              updateExercises(r.day_of_week, next);
                            }}
                          />
                        </div>
                        <div className="flex items-end sm:justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-[44px] text-red-600"
                            onClick={() => {
                              const next = (r.exercises as PlanExercise[]).filter((_, i) => i !== idx);
                              updateExercises(r.day_of_week, next.length ? next : [newExercise()]);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px]"
                      onClick={() => updateExercises(r.day_of_week, [...(r.exercises as PlanExercise[]), newExercise()])}
                    >
                      Add exercise
                    </Button>
                  </div>
                )}
              </Card>
            ))
        )}
        <Button type="button" className="min-h-[48px] w-full" disabled={saving || loading} onClick={() => void saveAll()}>
          {saving ? "Saving…" : "Save all"}
        </Button>
      </div>
    </div>
  );
}
