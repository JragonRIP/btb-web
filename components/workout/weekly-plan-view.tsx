"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { DayType, WeeklyWorkoutPlanRow } from "@/types";
import { cn } from "@/lib/utils";
import { MON_FIRST_DB_DOW, dateForDbDayOfWeek } from "@/lib/week-dates";
import { DayWorkoutPanel } from "@/components/workout/day-workout-panel";
import { readWeeklyPlanBootstrap } from "@/lib/btb-client-hydrate";
import { jsonSame } from "@/lib/btb-json-same";
import { readWeeklyPlanCache, writeWeeklyPlanCache } from "@/lib/btb-local-cache";

const PILL_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function WeeklyPlanView() {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const [rows, setRows] = useState<WeeklyWorkoutPlanRow[]>([]);
  const [offline, setOffline] = useState(false);
  const todayDbDow = new Date().getDay();
  const [selectedDow, setSelectedDow] = useState(todayDbDow);
  const [pillsMotion, setPillsMotion] = useState(false);
  const [planDataReady, setPlanDataReady] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const pillMotionApplied = useRef(false);
  const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const snap = readWeeklyPlanBootstrap();
    if (snap == null) return;
    setRows(snap);
    setPlanDataReady(true);
    setAnimReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      if (aliveRef.current) setPlanDataReady(true);
      return;
    }
    const cached = readWeeklyPlanCache(user.id);
    if (cached?.v) {
      setRows((prev) => (jsonSame(prev, cached.v) ? prev : cached.v));
      setOffline(false);
    }
    try {
      const { data, error } = await supabase
        .from("weekly_workout_plan")
        .select("*")
        .eq("user_id", user.id)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      if (!aliveRef.current) return;
      const next = (data ?? []) as WeeklyWorkoutPlanRow[];
      setRows((prev) => (jsonSame(prev, next) ? prev : next));
      writeWeeklyPlanCache(user.id, next);
      setOffline(false);
    } catch {
      if (!aliveRef.current) return;
      if (!cached?.v) setRows([]);
      setOffline(true);
    } finally {
      if (aliveRef.current) setPlanDataReady(true);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (supabase) return;
    if (aliveRef.current) setPlanDataReady(true);
  }, [supabase]);

  useEffect(() => {
    if (!planDataReady || animReady) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setAnimReady(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [planDataReady, animReady]);

  useEffect(() => {
    if (!animReady || pillMotionApplied.current) return;
    pillMotionApplied.current = true;
    setPillsMotion(true);
  }, [animReady]);

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

  return (
    <div className="relative">
      {offline && (
        <div className="pointer-events-none fixed left-3 top-[calc(max(env(safe-area-inset-top,0px),16px)+10px)] z-50 rounded-full border border-line bg-surface/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted shadow-soft dark:bg-elevated">
          Offline
        </div>
      )}
      <header className="border-b border-line/80 bg-canvas/80 px-4 pb-4 pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)] backdrop-blur-md">
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">Workout</h1>
        <p className="mt-1 text-sm text-muted">Pick a day, then train or recover. Use guided setup if you&apos;re new.</p>
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
              style={{ ["--btb-pi" as string]: idx } as CSSProperties}
              className={cn(
                "shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition min-h-[44px]",
                animReady && pillsMotion && "btb-workout-pill",
                sel ? "bg-gold text-black shadow-gold" : "bg-elevated text-muted ring-1 ring-line/60"
              )}
            >
              {PILL_LABELS[idx]}
            </button>
          );
        })}
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-6">
        {!configured ? (
          <div className="rounded-2xl border border-line bg-surface/60 p-8 text-center dark:bg-elevated/40">
            <p className="font-medium text-ink">No workout set — configure in Settings</p>
            <Link
              href="/workout/setup-flow"
              className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gold px-6 text-sm font-medium text-zinc-950 shadow-gold transition hover:brightness-110 dark:text-white"
            >
              Set up your workouts
            </Link>
          </div>
        ) : (
          <DayWorkoutPanel dow={selectedDow} dateStr={sessionDate} layout="embedded" />
        )}
      </div>
    </div>
  );
}
