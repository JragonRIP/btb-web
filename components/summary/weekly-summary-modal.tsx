"use client";

import { useEffect, useState } from "react";
import { format, eachDayOfInterval, endOfWeek, startOfWeek } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type WeeklySummaryStats = {
  weekStart: string;
  workoutsDone: number;
  avgSleep: number | null;
  calorieDays: number;
  proteinDays: number;
};

function oneLiner(stats: WeeklySummaryStats): string {
  if (stats.workoutsDone >= 5 && stats.calorieDays >= 5) return "Elite week — keep stacking wins.";
  if (stats.workoutsDone >= 3) return "Solid training rhythm. Stay consistent.";
  if (stats.avgSleep != null && stats.avgSleep >= 8) return "Recovery is dialed in. Beautiful work.";
  return "Every week is a new rep — show up again Monday.";
}

export async function buildWeeklySummaryStats(
  supabase: SupabaseClient,
  userId: string,
  anchor: Date
): Promise<WeeklySummaryStats> {
  const ws = startOfWeek(anchor, { weekStartsOn: 1 });
  const we = endOfWeek(anchor, { weekStartsOn: 1 });
  const weekStart = format(ws, "yyyy-MM-dd");
  const days = eachDayOfInterval({ start: ws, end: we });

  const { data: profile } = await supabase
    .from("profiles")
    .select("calorie_goal, protein_goal_g")
    .eq("id", userId)
    .maybeSingle();

  const calGoal = profile?.calorie_goal ?? 2500;
  const protGoal = profile?.protein_goal_g ?? 140;

  let workoutsDone = 0;
  let calorieDays = 0;
  let proteinDays = 0;
  const sleepHours: number[] = [];

  for (const d of days) {
    const ds = format(d, "yyyy-MM-dd");
    const { data: wl } = await supabase
      .from("workout_logs")
      .select("completed")
      .eq("user_id", userId)
      .eq("date", ds)
      .maybeSingle();
    if (wl?.completed) workoutsDone++;

    const { data: foods } = await supabase
      .from("food_logs")
      .select("calories, protein_g")
      .eq("user_id", userId)
      .eq("date", ds);
    const cals = (foods ?? []).reduce((a, r) => a + r.calories, 0);
    const prot = (foods ?? []).reduce((a, r) => a + Number(r.protein_g), 0);
    if (cals >= calGoal) calorieDays++;
    if (prot >= protGoal) proteinDays++;

    const { data: sl } = await supabase
      .from("sleep_logs")
      .select("duration_hours")
      .eq("user_id", userId)
      .eq("date", ds)
      .maybeSingle();
    if (sl?.duration_hours != null) sleepHours.push(Number(sl.duration_hours));
  }

  const avgSleep =
    sleepHours.length > 0 ? Math.round((sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length) * 10) / 10 : null;

  return { weekStart, workoutsDone, avgSleep, calorieDays, proteinDays };
}

export function WeeklySummaryModal({
  open,
  stats,
  onDismiss,
  busy,
}: {
  open: boolean;
  stats: WeeklySummaryStats | null;
  onDismiss: () => void;
  busy?: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(t);
    }
    setShow(false);
  }, [open]);

  if (!open || !stats) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:items-center",
        show ? "opacity-100" : "opacity-0"
      )}
      role="dialog"
      aria-modal
      aria-labelledby="ws-title"
    >
      <Card
        className={cn(
          "max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-gold transition-transform duration-300",
          show ? "translate-y-0 scale-100" : "translate-y-6 scale-95"
        )}
      >
        <h2 id="ws-title" className="font-display text-2xl font-semibold text-ink">
          Weekly summary
        </h2>
        <p className="mt-1 text-sm text-muted">Week of {format(new Date(stats.weekStart + "T12:00:00"), "MMM d, yyyy")}</p>

        <ul className="mt-6 space-y-3 text-sm">
          <li className="flex justify-between border-b border-line/60 py-2">
            <span className="text-muted">Workouts completed</span>
            <span className="font-semibold text-gold">{stats.workoutsDone} / 7</span>
          </li>
          <li className="flex justify-between border-b border-line/60 py-2">
            <span className="text-muted">Avg sleep</span>
            <span className="font-semibold text-ink">{stats.avgSleep != null ? `${stats.avgSleep} h` : "—"}</span>
          </li>
          <li className="flex justify-between border-b border-line/60 py-2">
            <span className="text-muted">Days calorie goal hit</span>
            <span className="font-semibold text-ink">{stats.calorieDays} / 7</span>
          </li>
          <li className="flex justify-between py-2">
            <span className="text-muted">Days protein goal hit</span>
            <span className="font-semibold text-ink">{stats.proteinDays} / 7</span>
          </li>
        </ul>

        <p className="mt-6 rounded-xl border border-gold/30 bg-gold/5 px-3 py-3 text-center text-sm font-medium text-ink">
          {oneLiner(stats)}
        </p>

        <Button type="button" className="mt-8 min-h-[48px] w-full" disabled={busy} onClick={onDismiss}>
          {busy ? "Saving…" : "Continue"}
        </Button>
      </Card>
    </div>
  );
}
