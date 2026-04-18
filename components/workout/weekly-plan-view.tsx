"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { DayType, WeeklyWorkoutPlanRow } from "@/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MON_FIRST_DB_DOW, dateForDbDayOfWeek } from "@/lib/week-dates";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const badge: Record<DayType, string> = {
  workout: "bg-gold/20 text-ink dark:text-white",
  active_rest: "bg-white/15 text-ink dark:text-white",
  full_rest: "bg-line/20 text-muted",
};

export function WeeklyPlanView() {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const [rows, setRows] = useState<WeeklyWorkoutPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    const { data, error } = await supabase
      .from("weekly_workout_plan")
      .select("*")
      .eq("user_id", user.id)
      .order("day_of_week", { ascending: true });
    if (error) console.error(error);
    setRows((data ?? []) as WeeklyWorkoutPlanRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDow = new Map(rows.map((r) => [r.day_of_week, r]));

  if (envError) return <p className="p-6 text-sm text-red-600">{envError}</p>;
  if (!supabase) return <Skeleton className="m-4 h-40" />;

  return (
    <div>
      <header className="border-b border-line/80 bg-canvas/80 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] backdrop-blur-md">
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">Weekly plan</h1>
        <p className="mt-1 text-sm text-muted">Tap a day to train or recover.</p>
      </header>
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        {loading && <Skeleton className="h-32 w-full" />}
        {!loading &&
          MON_FIRST_DB_DOW.map((dow, idx) => {
            const row = byDow.get(dow);
            const session = dateForDbDayOfWeek(new Date(), dow);
            const ds = format(session, "yyyy-MM-dd");
            return (
              <Link key={dow} href={`/workout/day/${dow}?date=${ds}`} className="block min-h-[44px]">
                <Card className="p-4 transition hover:border-gold/40 hover:shadow-gold">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-display text-lg font-semibold text-ink">{DAY_NAMES[idx]}</p>
                      <p className="text-xs text-muted">{format(session, "MMM d")}</p>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", badge[row?.day_type ?? "workout"])}>
                      {(row?.day_type ?? "workout").replace("_", " ")}
                    </span>
                  </div>
                  {row?.muscle_group && <p className="mt-2 text-sm text-gold">{row.muscle_group}</p>}
                  {!row && <p className="mt-2 text-sm text-muted">Not configured — set up in Settings.</p>}
                </Card>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
