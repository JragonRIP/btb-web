"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Workout, WorkoutType } from "@/types";
import { WorkoutsWeeklyChart } from "@/components/charts/workouts-weekly-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TYPES: { value: WorkoutType; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "HIIT", label: "HIIT" },
  { value: "yoga", label: "Yoga" },
  { value: "other", label: "Other" },
];

export function WorkoutsView() {
  const { client: supabase, error: supabaseInitError } = useSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Workout[]>([]);
  const [filter, setFilter] = useState<WorkoutType | "all">("all");

  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [type, setType] = useState<WorkoutType>("strength");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("workouts").select("*").order("date", { ascending: false }).limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Workout[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (supabase) void load();
  }, [load, supabase]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => (r.type as WorkoutType | null) === filter);
  }, [rows, filter]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setSaving(false);
      return;
    }
    const duration_minutes = duration.trim() === "" ? null : Number(duration);
    if (duration_minutes != null && !Number.isFinite(duration_minutes)) {
      toast.error("Duration must be a number.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("workouts").insert({
      user_id: user.id,
      date,
      type,
      duration_minutes,
      notes: notes.trim() === "" ? null : notes.trim(),
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Workout saved");
      setDuration("");
      setNotes("");
      await load();
    }
    setSaving(false);
  }

  async function removeRow(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      await load();
    }
  }

  if (supabaseInitError) {
    return (
      <div>
        <PageHeader title="Workouts" subtitle="Log sessions, filter history, and watch weekly volume." />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Card className="border-red-500/40 bg-red-500/5 p-4 text-sm text-ink">
            <p className="font-medium text-red-700 dark:text-red-300">Supabase configuration</p>
            <p className="mt-2 text-muted">{supabaseInitError}</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div>
        <PageHeader title="Workouts" subtitle="Log sessions, filter history, and watch weekly volume." />
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-10">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Workouts" subtitle="Log sessions, filter history, and watch weekly volume." />

      <div className="mx-auto max-w-3xl px-4 pb-10">
        <Card id="log" className="scroll-mt-28 p-4 md:scroll-mt-24">
          <CardTitle>Log workout</CardTitle>
          <CardDescription>Date, modality, duration, and optional notes.</CardDescription>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="w-date">Date</Label>
              <Input id="w-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-type">Type</Label>
              <Select id="w-type" value={type} onChange={(e) => setType(e.target.value as WorkoutType)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-dur">Duration (minutes)</Label>
              <Input id="w-dur" inputMode="numeric" placeholder="45" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="w-notes">Notes</Label>
              <Textarea id="w-notes" placeholder="Warm-up, PRs, how it felt…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving…" : "Save workout"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="mt-6 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Weekly volume</CardTitle>
              <CardDescription>Workouts per week for the last 8 weeks.</CardDescription>
            </div>
          </div>
          <div className="mt-4">
            {loading ? <Skeleton className="h-56 w-full" /> : <WorkoutsWeeklyChart workouts={rows} />}
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Filter</span>
          {(["all", ...TYPES.map((t) => t.value)] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filter === key
                  ? "border-gold/50 bg-gold/10 text-ink dark:text-white"
                  : "border-line text-muted hover:text-ink"
              )}
            >
              {key === "all" ? "All" : TYPES.find((t) => t.value === key)?.label}
            </button>
          ))}
        </div>

        <Card className="mt-4 overflow-hidden p-0">
          <div className="border-b border-line px-4 py-3">
            <CardTitle className="text-base">History</CardTitle>
            <CardDescription>Newest first.</CardDescription>
          </div>
          <ul className="divide-y divide-line/80">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <Skeleton className="h-12 w-full" />
                </li>
              ))}
            {!loading && filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">No workouts match this filter.</li>
            )}
            {!loading &&
              filtered.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize text-ink">{r.type ?? "Workout"}</p>
                    <p className="text-xs text-muted">
                      {r.date}
                      {r.duration_minutes != null ? ` · ${r.duration_minutes} min` : ""}
                    </p>
                    {r.notes && <p className="mt-1 text-sm text-muted">{r.notes}</p>}
                  </div>
                  <Button variant="ghost" size="sm" type="button" className="self-start text-red-600" onClick={() => void removeRow(r.id)}>
                    Delete
                  </Button>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
