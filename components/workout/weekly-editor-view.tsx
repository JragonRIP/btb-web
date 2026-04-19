"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { DayType, PlanExercise, WeeklyWorkoutPlanRow } from "@/types";
import { MON_FIRST_DB_DOW } from "@/lib/week-dates";
import { formatExerciseMetaLine, newExerciseId, normalizePlanExercise } from "@/lib/plan-exercise";
import { writeWeeklyPlanCache } from "@/lib/btb-local-cache";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseInlineForm } from "@/components/workout/exercise-inline-form";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

const DOW_ORDER = [...MON_FIRST_DB_DOW];
const DOW_LABEL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function dayTypeBadge(dt: DayType) {
  if (dt === "active_rest") return { label: "Active rest", className: "bg-elevated text-muted ring-1 ring-line/60" };
  if (dt === "full_rest") return { label: "Full rest", className: "bg-elevated text-muted ring-1 ring-line/60" };
  return { label: "Workout", className: "bg-gold/15 text-gold ring-1 ring-gold/30" };
}

export function WeeklyEditorView({ backHref = "/settings" }: { backHref?: string }) {
  const { client: supabase } = useSupabaseBrowser();
  const router = useRouter();
  const [rows, setRows] = useState<WeeklyWorkoutPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDow, setExpandedDow] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    const raw = (data ?? []) as WeeklyWorkoutPlanRow[];
    const list = raw.map((r) => ({
      ...r,
      exercises: Array.isArray(r.exercises)
        ? (r.exercises as PlanExercise[]).map((e) =>
            normalizePlanExercise({ ...(e as PlanExercise), id: (e as PlanExercise).id || newExerciseId() })
          )
        : [],
    }));
    if (list.length === 0) {
      const seed: WeeklyWorkoutPlanRow[] = DOW_ORDER.map((day_of_week) => ({
        user_id: user.id,
        day_of_week,
        muscle_group: "",
        day_type: "workout" as DayType,
        exercises: [],
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

  function rowByDow(dow: number): WeeklyWorkoutPlanRow | undefined {
    return rows.find((r) => r.day_of_week === dow);
  }

  function updateLocal(dow: number, patch: Partial<WeeklyWorkoutPlanRow>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === dow ? { ...r, ...patch } : r)));
  }

  async function persistDow(dow: number, next: WeeklyWorkoutPlanRow) {
    if (!supabase) return false;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return false;
    }
    const payload = {
      user_id: user.id,
      day_of_week: next.day_of_week,
      muscle_group: next.muscle_group ?? "",
      day_type: next.day_type,
      exercises: next.exercises.map((e) => normalizePlanExercise(e)),
    };
    const { error } = await supabase.from("weekly_workout_plan").upsert(payload, { onConflict: "user_id,day_of_week" });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return false;
    }
    setRows((prev) => {
      const merged = prev.map((r) => (r.day_of_week === dow ? next : r));
      writeWeeklyPlanCache(user.id, [...merged].sort((a, b) => a.day_of_week - b.day_of_week));
      return merged;
    });
    setSaving(false);
    router.refresh();
    return true;
  }

  async function patchAndSave(dow: number, patch: Partial<WeeklyWorkoutPlanRow>) {
    const base = rowByDow(dow);
    if (!base) return;
    const next: WeeklyWorkoutPlanRow = {
      ...base,
      ...patch,
      exercises: patch.exercises ?? base.exercises,
    };
    await persistDow(dow, next);
  }

  if (!supabase) return null;

  return (
    <div>
      <PageHeader title="Workout settings" backHref={backHref} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Card className="p-4">
          <p className="text-sm text-muted">
            Prefer the guided planner?{" "}
            <Link href="/workout/setup-flow" className="font-semibold text-gold underline-offset-2 hover:underline">
              Set up workouts
            </Link>
          </p>
        </Card>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          DOW_ORDER.map((dow, idx) => {
            const r = rowByDow(dow);
            if (!r) return null;
            const open = expandedDow === dow;
            const dt = (r.day_type as DayType) ?? "workout";
            const badge = dayTypeBadge(dt);
            const exs = (r.exercises ?? []) as PlanExercise[];
            const addingOpen = open && showAddForm && !editingId;
            return (
              <Card key={dow} className="overflow-hidden">
                <button
                  type="button"
                  className="flex min-h-[48px] w-full items-center gap-3 p-4 text-left transition hover:bg-elevated/40"
                  onClick={() => {
                    setExpandedDow(open ? null : dow);
                    setShowAddForm(false);
                    setEditingId(null);
                  }}
                >
                  {open ? <ChevronDown className="h-5 w-5 shrink-0 text-muted" /> : <ChevronRight className="h-5 w-5 shrink-0 text-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold text-ink">{DOW_LABEL[idx]}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {(r.muscle_group ?? "").trim() || "—"} · {exs.length} exercise{exs.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", badge.className)}>
                    {badge.label}
                  </span>
                </button>
                {open && (
                  <div className="space-y-4 border-t border-line/80 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Day type</Label>
                        <Select
                          className="mt-1 min-h-[44px]"
                          value={dt}
                          disabled={saving}
                          onChange={(e) => {
                            const v = e.target.value as DayType;
                            void patchAndSave(dow, { day_type: v, exercises: v === "workout" ? exs : [] });
                          }}
                        >
                          <option value="workout">Workout</option>
                          <option value="active_rest">Active rest</option>
                          <option value="full_rest">Full rest</option>
                        </Select>
                      </div>
                      <div>
                        <Label>Muscle group</Label>
                        <Input
                          className="mt-1 min-h-[44px]"
                          disabled={saving || dt !== "workout"}
                          value={r.muscle_group ?? ""}
                          onChange={(e) => updateLocal(dow, { muscle_group: e.target.value })}
                          onBlur={(e) => void patchAndSave(dow, { muscle_group: e.target.value })}
                        />
                      </div>
                    </div>
                    {dt === "workout" && (
                      <div className="space-y-3">
                        <Label>Exercises</Label>
                        {exs.length === 0 ? (
                          <p className="text-sm text-muted">No exercises yet.</p>
                        ) : (
                          exs.map((ex) => (
                            <div key={ex.id} className="rounded-xl border border-line p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink">{ex.name}</p>
                                  <p className="text-xs uppercase tracking-wide text-muted">{ex.exerciseType === "timed" ? "Timed" : "Reps"}</p>
                                  <p className="text-sm text-muted">{formatExerciseMetaLine(normalizePlanExercise(ex))}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="min-h-[44px]"
                                    disabled={saving}
                                    onClick={() => {
                                      setEditingId(ex.id);
                                      setShowAddForm(false);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="min-h-[44px] text-red-600"
                                    disabled={saving}
                                    onClick={() => void patchAndSave(dow, { exercises: exs.filter((x) => x.id !== ex.id) })}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                              {editingId === ex.id ? (
                                <div className="mt-3">
                                  <ExerciseInlineForm
                                    key={ex.id}
                                    initial={ex}
                                    submitLabel="Save"
                                    onCancel={() => setEditingId(null)}
                                    onSubmit={(next) => {
                                      void patchAndSave(dow, {
                                        exercises: exs.map((x) => (x.id === ex.id ? normalizePlanExercise(next) : x)),
                                      });
                                      setEditingId(null);
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                        {addingOpen ? (
                          <ExerciseInlineForm
                            initial={null}
                            onCancel={() => setShowAddForm(false)}
                            onSubmit={(ex) => {
                              void patchAndSave(dow, { exercises: [...exs, normalizePlanExercise(ex)] });
                              setShowAddForm(false);
                            }}
                          />
                        ) : null}
                        {!addingOpen && !editingId ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] w-full"
                            disabled={saving}
                            onClick={() => setShowAddForm(true)}
                          >
                            Add exercise
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
