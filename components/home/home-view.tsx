"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO, startOfWeek, subWeeks, isFriday } from "date-fns";
import { Settings2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { FoodLog, Profile, SleepLog } from "@/types";
import { RingProgress } from "@/components/ui/ring-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  WeeklySummaryModal,
  buildWeeklySummaryStats,
  type WeeklySummaryStats,
} from "@/components/summary/weekly-summary-modal";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export function HomeView() {
  const { client: supabase, error: supabaseInitError } = useSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [foodToday, setFoodToday] = useState<FoodLog[]>([]);
  const [lastSleep, setLastSleep] = useState<SleepLog | null>(null);
  const [weekFood, setWeekFood] = useState<FoodLog[]>([]);
  const [weekWorkouts, setWeekWorkouts] = useState<{ date: string; completed: boolean }[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [fridayWeight, setFridayWeight] = useState("");
  const [fridayDismissed, setFridayDismissed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryStats, setSummaryStats] = useState<WeeklySummaryStats | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const touchRef = useRef<{ x: number } | null>(null);
  const summaryFired = useRef(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isFri = isFriday(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isFri) return;
    const k = `btb-friday-weigh-${todayStr}`;
    setFridayDismissed(localStorage.getItem(k) === "1");
  }, [isFri, todayStr]);

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

    const [{ data: p }, { data: ft }, { data: sl }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("date", todayStr).order("logged_at", { ascending: false }),
      supabase.from("sleep_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(1),
    ]);

    setProfile((p ?? null) as Profile | null);
    setFoodToday((ft ?? []) as FoodLog[]);
    setLastSleep((sl?.[0] ?? null) as SleepLog | null);

    const anchor = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
    const wkStart = format(anchor, "yyyy-MM-dd");
    const wkEnd = format(addDays(anchor, 7), "yyyy-MM-dd");

    const { data: wf } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", wkStart)
      .lt("date", wkEnd);
    setWeekFood((wf ?? []) as FoodLog[]);

    const { data: ww } = await supabase
      .from("workout_logs")
      .select("date, completed")
      .eq("user_id", user.id)
      .gte("date", wkStart)
      .lt("date", wkEnd);
    setWeekWorkouts((ww ?? []) as { date: string; completed: boolean }[]);

    setLoading(false);
  }, [supabase, todayStr, weekOffset]);

  useEffect(() => {
    if (supabase) void load();
  }, [load, supabase]);

  /** Sunday summary gate (once per session) */
  useEffect(() => {
    if (!supabase || loading || summaryFired.current) return;
    (async () => {
      const d = new Date();
      if (d.getDay() !== 0) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const ws = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const { data: seen } = await supabase
        .from("weekly_summaries")
        .select("id")
        .eq("user_id", user.id)
        .eq("week_start", ws)
        .maybeSingle();
      summaryFired.current = true;
      if (seen) return;
      const stats = await buildWeeklySummaryStats(supabase, user.id, d);
      setSummaryStats(stats);
      setSummaryOpen(true);
    })();
  }, [supabase, loading]);

  const totals = useMemo(() => {
    const cal = foodToday.reduce((a, r) => a + r.calories, 0);
    const prot = foodToday.reduce((a, r) => a + Number(r.protein_g), 0);
    return { cal, prot };
  }, [foodToday]);

  const calGoal = profile?.calorie_goal ?? 2500;
  const protGoal = profile?.protein_goal_g ?? 140;
  const displayName = profile?.name?.trim() || "there";

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  }, [now]);

  const weekDays = useMemo(() => {
    const anchor = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
    return Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  }, [weekOffset]);

  async function dismissFriday() {
    localStorage.setItem(`btb-friday-weigh-${todayStr}`, "1");
    setFridayDismissed(true);
  }

  async function submitFridayWeight() {
    if (!supabase) return;
    const w = Number(fridayWeight);
    if (!Number.isFinite(w) || w <= 0) {
      toast.error("Enter a valid weight.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("weight_logs").insert({
      user_id: user.id,
      date: todayStr,
      weight_lbs: w,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Weight logged");
      await supabase.from("profiles").update({ weight_lbs: w }).eq("id", user.id);
      setFridayWeight("");
      void dismissFriday();
      void load();
    }
  }

  async function dismissSummary() {
    if (!supabase || !summaryStats) return;
    setSummaryBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSummaryBusy(false);
      return;
    }
    const { error } = await supabase.from("weekly_summaries").insert({
      user_id: user.id,
      week_start: summaryStats.weekStart,
    });
    if (error) toast.error(error.message);
    setSummaryOpen(false);
    setSummaryBusy(false);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchRef.current = { x: e.touches[0].clientX };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current?.x;
    touchRef.current = null;
    if (start == null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (dx > 60 && weekOffset < 8) setWeekOffset((w) => w + 1);
    if (dx < -60 && weekOffset > 0) setWeekOffset((w) => w - 1);
  }

  if (supabaseInitError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="border-red-500/40 bg-red-500/5 p-4 text-sm">{supabaseInitError}</Card>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="space-y-4 px-4 pb-8 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 pb-28 pt-[calc(env(safe-area-inset-top,0px)+12px)] md:pb-10"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{format(now, "EEEE, MMMM d")}</p>
          <p className="mt-1 font-mono text-lg font-medium text-gold">{format(now, "h:mm a")}</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-gold md:text-4xl">
            {greeting}, {displayName}
          </h1>
        </div>
        <Link
          href="/settings"
          className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-line bg-surface shadow-soft transition hover:border-gold/40 hover:shadow-gold dark:bg-elevated dark:shadow-soft-dark"
          aria-label="Settings"
        >
          <Settings2 className="h-5 w-5 text-gold" />
        </Link>
      </div>

      {isFri && !fridayDismissed && (
        <Card className="mb-6 border-gold/40 bg-gold/5 p-4">
          <p className="font-medium text-ink">Time for your weekly weigh-in!</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Weight (lbs)"
              className="min-h-[48px] max-w-[160px]"
              value={fridayWeight}
              onChange={(e) => setFridayWeight(e.target.value)}
            />
            <Button type="button" className="min-h-[48px]" onClick={() => void submitFridayWeight()}>
              Log
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px]" onClick={() => void dismissFriday()}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center py-6">
          <RingProgress
            label="Calories"
            value={totals.cal}
            max={calGoal}
            sublabel={`${Math.round(totals.cal)} / ${calGoal}`}
          />
        </Card>
        <Card className="flex flex-col items-center py-6">
          <RingProgress
            label="Protein"
            value={totals.prot}
            max={protGoal}
            sublabel={`${Math.round(totals.prot)}g / ${protGoal}g`}
          />
        </Card>
      </div>

      <Card className="mb-8 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sleep last night</p>
            <p className="mt-2 font-display text-xl font-semibold text-ink">
              {lastSleep?.duration_hours != null ? `${lastSleep.duration_hours} h` : "Log sleep"}
            </p>
            {lastSleep?.duration_hours == null && (
              <Link href="/sleep#log" className="mt-2 inline-block text-sm font-medium text-gold hover:underline">
                Open sleep
              </Link>
            )}
          </div>
          <div className="border-l border-line/60 pl-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Streak</p>
            <div className="mt-2 flex items-center gap-2">
              <Zap className="h-6 w-6 text-gold" />
              <span className="font-display text-3xl font-bold text-gold">{profile?.current_streak ?? 0}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Best: {profile?.best_streak ?? 0}</p>
          </div>
        </div>
      </Card>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">This week</h2>
        <p className="text-xs text-muted">Swipe for past weeks · {weekOffset === 0 ? "Current" : `${weekOffset} wk ago`}</p>
      </div>
      <Card className="mb-10 p-4">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="flex justify-between gap-1">
            {weekDays.map((d, i) => {
              const ds = format(d, "yyyy-MM-dd");
              const isToday = ds === todayStr;
              const dayFood = weekFood.filter((f) => f.date === ds);
              const cals = dayFood.reduce((a, f) => a + f.calories, 0);
              const prot = dayFood.reduce((a, f) => a + Number(f.protein_g), 0);
              const wk = weekWorkouts.find((w) => w.date === ds);
              const hCal = Math.min(100, (cals / calGoal) * 100);
              const hProt = Math.min(100, (prot / protGoal) * 100);
              const hWk = wk?.completed ? 100 : 0;
              return (
                <button
                  key={ds}
                  type="button"
                  className={cn(
                    "flex min-h-[44px] min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-0.5 py-2 transition",
                    isToday && "bg-gold/10 ring-1 ring-gold/40"
                  )}
                  onClick={() => setSelectedDay(selectedDay === ds ? null : ds)}
                >
                  <span className="text-[10px] font-semibold text-muted">{DAY_LABELS[i]}</span>
                  <div className="flex h-24 w-full max-w-[40px] items-end justify-center gap-0.5">
                    {[
                      { h: hCal, c: "bg-gold" },
                      { h: hProt, c: "bg-gold/70" },
                      { h: hWk, c: "bg-white/60 dark:bg-white/35" },
                    ].map((bar, bi) => (
                      <div key={bi} className="flex h-full w-2 flex-col justify-end rounded-sm bg-line/25">
                        <div
                          className={cn("w-full rounded-t-sm transition-all", bar.c)}
                          style={{ height: `${Math.max(2, (bar.h / 100) * 96)}px` }}
                        />
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {selectedDay && (
          <p className="mt-3 rounded-lg bg-elevated/80 px-3 py-2 text-center text-xs text-muted">
            {format(parseISO(selectedDay + "T12:00:00"), "EEEE, MMM d")} — tap day again to close
          </p>
        )}
      </Card>

      <WeeklySummaryModal open={summaryOpen} stats={summaryStats} onDismiss={() => void dismissSummary()} busy={summaryBusy} />
    </div>
  );
}
