"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import Link from "next/link";
import { format, parseISO, startOfWeek } from "date-fns";
import { Dumbbell, Moon, Plus, Ruler } from "lucide-react";
import { toast } from "sonner";
import type { ActivityItem, Measurement, SleepLog, Workout } from "@/types";
import { DashboardSettings } from "@/components/dashboard/dashboard-settings";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardView() {
  const supabase = useSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [sleep, setSleep] = useState<SleepLog[]>([]);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const [{ data: w, error: we }, { data: m, error: me }, { data: s, error: se }] = await Promise.all([
      supabase.from("workouts").select("*").order("date", { ascending: false }).limit(80),
      supabase.from("measurements").select("*").order("date", { ascending: false }).limit(40),
      supabase.from("sleep_logs").select("*").order("date", { ascending: false }).limit(40),
    ]);
    if (we) toast.error(we.message);
    if (me) toast.error(me.message);
    if (se) toast.error(se.message);
    setWorkouts((w ?? []) as Workout[]);
    setMeasurements((m ?? []) as Measurement[]);
    setSleep((s ?? []) as SleepLog[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (supabase) void load();
  }, [load, supabase]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const workoutsThisWeek = useMemo(() => {
    return workouts.filter((r) => {
      const d = parseISO(r.date + "T12:00:00");
      return d >= weekStart;
    }).length;
  }, [workouts, weekStart]);

  const latestWeight = useMemo(() => {
    const row = measurements.find((r) => r.weight_lbs != null);
    return row?.weight_lbs != null ? Number(row.weight_lbs) : null;
  }, [measurements]);

  const lastSleep = useMemo(() => sleep[0] ?? null, [sleep]);

  const activity = useMemo(() => {
    const items: ActivityItem[] = [];
    for (const r of workouts) {
      items.push({
        kind: "workout",
        id: r.id,
        created_at: r.created_at,
        label: r.type ? `${r.type} workout` : "Workout",
        meta: `${r.date}${r.duration_minutes != null ? ` · ${r.duration_minutes} min` : ""}`,
      });
    }
    for (const r of measurements) {
      items.push({
        kind: "measurement",
        id: r.id,
        created_at: r.created_at,
        label: "Measurements",
        meta: r.date,
      });
    }
    for (const r of sleep) {
      items.push({
        kind: "sleep",
        id: r.id,
        created_at: r.created_at,
        label: "Sleep",
        meta: `${r.date}${r.duration_hours != null ? ` · ${r.duration_hours} h` : ""}`,
      });
    }
    return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 12);
  }, [workouts, measurements, sleep]);

  if (!supabase) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Build The Body</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            Your training, body, and recovery — distilled into one calm overview.
          </p>
        </div>
        <DashboardSettings />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="This week"
          loading={loading}
          value={workoutsThisWeek.toString()}
          hint="workouts logged"
        />
        <SummaryCard
          title="Latest weight"
          loading={loading}
          value={latestWeight != null ? `${latestWeight}` : "—"}
          hint={latestWeight != null ? "lbs" : "add a measurement"}
        />
        <SummaryCard
          title="Last sleep"
          loading={loading}
          value={lastSleep?.duration_hours != null ? `${lastSleep.duration_hours}` : "—"}
          hint={lastSleep?.duration_hours != null ? "hours" : "log tonight"}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <QuickAdd href="/workouts#log" icon={Dumbbell} label="Workout" />
        <QuickAdd href="/measurements#log" icon={Ruler} label="Measurements" />
        <QuickAdd href="/sleep#log" icon={Moon} label="Sleep" />
      </div>

      <Card className="mt-8 p-0 overflow-hidden" glow>
        <div className="border-b border-line px-4 py-3">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Latest updates across your trackers.</CardDescription>
        </div>
        <ul className="divide-y divide-line/80">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <Skeleton className="h-10 w-full" />
              </li>
            ))}
          {!loading && activity.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted">Nothing here yet — log your first entry.</li>
          )}
          {!loading &&
            activity.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-elevated">
                  <KindIcon kind={item.kind} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.label}</p>
                  <p className="truncate text-xs text-muted">{item.meta}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {format(parseISO(item.created_at), "MMM d, h:mm a")}
                </span>
              </li>
            ))}
        </ul>
      </Card>

      <div className="mt-10 text-center">
        <Button variant="ghost" className="text-muted" onClick={() => void load()}>
          Refresh data
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  loading,
}: {
  title: string;
  value: string;
  hint: string;
  loading: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-16" />
      ) : (
        <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
      )}
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Card>
  );
}

function QuickAdd({ href, icon: Icon, label }: { href: string; icon: typeof Dumbbell; label: string }) {
  return (
    <Link href={href}>
      <Button variant="secondary" size="sm" className="rounded-full border-gold/20 shadow-soft dark:shadow-soft-dark" type="button">
        <Plus className="h-4 w-4 text-gold" />
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

function KindIcon({ kind }: { kind: ActivityItem["kind"] }) {
  if (kind === "workout") return <Dumbbell className="h-4 w-4 text-gold" />;
  if (kind === "measurement") return <Ruler className="h-4 w-4 text-gold" />;
  return <Moon className="h-4 w-4 text-gold" />;
}
