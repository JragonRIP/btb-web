"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { DayType, WeeklyWorkoutPlanRow } from "@/types";
import { cn } from "@/lib/utils";
import { MON_FIRST_DB_DOW, dateForDbDayOfWeek } from "@/lib/week-dates";
import { DayWorkoutPanel } from "@/components/workout/day-workout-panel";
import { readWeeklyPlanCache, writeWeeklyPlanCache } from "@/lib/btb-local-cache";

const PILL_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function WeeklyPlanView() {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const [rows, setRows] = useState<WeeklyWorkoutPlanRow[]>([]);
  const [offline, setOffline] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const todayDbDow = new Date().getDay();
  const [selectedDow, setSelectedDow] = useState(todayDbDow);
  const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const load = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const cached = readWeeklyPlanCache(user.id);
    if (cached?.v?.length) {
      setRows(cached.v);
      setOffline(false);
    }
    try {
      const { data, error } = await supabase
        .from("weekly_workout_plan")
        .select("*")
        .eq("user_id", user.id)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      const next = (data ?? []) as WeeklyWorkoutPlanRow[];
      setRows(next);
      writeWeeklyPlanCache(user.id, next);
      setOffline(false);
    } catch {
      if (!cached?.v?.length) setRows([]);
      setOffline(true);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    const el = pillRefs.current.get(selectedDow);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedDow, rows]);

  const byDow = new Map(rows.map((r) => [r.day_of_week, r]));
  const sessionDate = format(dateForDbDayOfWeek(new Date(), selectedDow), "yyyy-MM-dd");
  const row = byDow.get(selectedDow);
  const dayType: DayType = (row?.day_type as DayType) ?? "workout";
  const exercises = (row?.exercises ?? []) as { id?: string }[];
  const configured =
    Boolean(row) && (dayType !== "workout" || (Array.isArray(exercises) && exercises.length > 0));

  if (envError) return <p className="p-6 text-sm text-red-600">{envError}</p>;
  if (!supabase) return <p className="p-6 text-muted">Loading…</p>;

  return (
    <div className="relative">
      {offline && (
        <div className="pointer-events-none fixed left-3 top-[calc(max(env(safe-area-inset-top,0px),16px)+10px)] z-50 rounded-full border border-line bg-surface/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted shadow-soft dark:bg-elevated">
          Offline
        </div>
      )}
      <header className="border-b border-line/80 bg-canvas/80 px-4 pb-4 pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)] backdrop-blur-md">
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">Workout</h1>
        <p className="mt-1 text-sm text-muted">Pick a day, then train or recover.</p>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4">
        {MON_FIRST_DB_DOW.map((dow, idx) => {
          const sel = dow === selectedDow;
          return (
            <button
              key={dow}
              type="button"
              ref={(el) => {
                if (el) pillRefs.current.set(dow, el);
                else pillRefs.current.delete(dow);
              }}
              onClick={() => setSelectedDow(dow)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition min-h-[44px]",
                sel ? "bg-gold text-black shadow-gold" : "bg-elevated text-muted ring-1 ring-line/60"
              )}
            >
              {PILL_LABELS[idx]}
            </button>
          );
        })}
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-28">
        {!configured ? (
          <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center dark:bg-elevated/40">
            <p className="font-medium text-ink">No workout set — configure in Settings</p>
            <Link
              href="/settings/weekly-workouts"
              className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gold px-6 text-sm font-medium text-zinc-950 shadow-gold transition hover:brightness-110 dark:text-white"
            >
              Edit weekly workouts
            </Link>
          </div>
        ) : (
          <DayWorkoutPanel dow={selectedDow} dateStr={sessionDate} layout="embedded" />
        )}
      </div>
    </div>
  );
}
