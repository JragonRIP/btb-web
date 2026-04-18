"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { FoodLog, Profile } from "@/types";
import { recomputeStreaks } from "@/lib/streak";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BTB_BOOT_SPINNER_MS,
  readFoodTodayCache,
  readProfileCache,
  writeFoodTodayCache,
  writeProfileCache,
} from "@/lib/btb-local-cache";

export function LogView() {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const [rows, setRows] = useState<FoodLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blockingSpinner, setBlockingSpinner] = useState(true);
  const [offline, setOffline] = useState(false);
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [prot, setProt] = useState("");
  const [saving, setSaving] = useState(false);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
    };
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  const refreshRemote = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      if (aliveRef.current) setBlockingSpinner(false);
      return;
    }

    const pCached = readProfileCache(user.id);
    const fCached = readFoodTodayCache(user.id, today);

    if (pCached?.v) setProfile(pCached.v);
    if (fCached?.v) setRows(fCached.v);

    const hadProfileCache = Boolean(pCached?.v);
    if (hadProfileCache) setBlockingSpinner(false);
    else {
      setBlockingSpinner(true);
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = setTimeout(() => setBlockingSpinner(false), BTB_BOOT_SPINNER_MS);
    }

    try {
      const [{ data: p, error: pe }, { data: f, error: fe }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("food_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", today)
          .order("logged_at", { ascending: false }),
      ]);
      if (pe) throw pe;
      if (fe) throw fe;
      if (!aliveRef.current) return;

      if (p) {
        const pr = p as Profile;
        setProfile(pr);
        writeProfileCache(user.id, pr);
      }
      const list = (f ?? []) as FoodLog[];
      setRows(list);
      writeFoodTodayCache(user.id, today, list);
      setOffline(false);
    } catch {
      if (aliveRef.current) setOffline(true);
    } finally {
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
      if (aliveRef.current) setBlockingSpinner(false);
    }
  }, [supabase, today]);

  useEffect(() => {
    if (supabase) void refreshRemote();
  }, [refreshRemote, supabase]);

  const totals = useMemo(() => {
    const c = rows.reduce((a, r) => a + r.calories, 0);
    const p = rows.reduce((a, r) => a + Number(r.protein_g), 0);
    return { c, p };
  }, [rows]);

  const calGoal = profile?.calorie_goal;
  const protGoal = profile?.protein_goal_g;
  const goalsReady = profile != null && calGoal != null && protGoal != null;

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const calories = Number(cal);
    const protein = Number(prot);
    if (!name.trim() || !Number.isFinite(calories) || !Number.isFinite(protein)) {
      toast.error("Fill food name, calories, and protein.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const tempId = `tmp_${Date.now()}`;
    const optimistic: FoodLog = {
      id: tempId,
      user_id: user.id,
      date: today,
      name: name.trim(),
      calories: Math.round(calories),
      protein_g: protein,
      logged_at: new Date().toISOString(),
    };

    setRows((prev) => {
      const next = [optimistic, ...prev];
      writeFoodTodayCache(user.id, today, next);
      return next;
    });
    setName("");
    setCal("");
    setProt("");
    setSaving(true);

    const { data: inserted, error } = await supabase
      .from("food_logs")
      .insert({
        user_id: user.id,
        date: today,
        name: optimistic.name,
        calories: optimistic.calories,
        protein_g: optimistic.protein_g,
      })
      .select("*")
      .single();

    if (error) {
      toast.error(error.message);
      setRows((prev) => {
        const next = prev.filter((r) => r.id !== tempId);
        writeFoodTodayCache(user.id, today, next);
        return next;
      });
    } else if (inserted) {
      const row = inserted as FoodLog;
      setRows((prev) => {
        const next = prev.map((r) => (r.id === tempId ? row : r));
        writeFoodTodayCache(user.id, today, next);
        return next;
      });
      toast.success("Logged");
      void recomputeStreaks(supabase, user.id);
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    writeFoodTodayCache(
      user.id,
      today,
      prev.filter((x) => x.id !== id)
    );
    const { error } = await supabase.from("food_logs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      setRows(prev);
      writeFoodTodayCache(user.id, today, prev);
    } else {
      toast.success("Removed");
      void recomputeStreaks(supabase, user.id);
    }
  }

  if (envError) {
    return (
      <div>
        <PageHeader title="Log" subtitle="Food & nutrition" />
        <div className="mx-auto max-w-3xl p-4 text-sm text-red-600">{envError}</div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div>
        <PageHeader title="Log" subtitle="Food & nutrition" />
        <Skeleton className="m-4 h-40" />
      </div>
    );
  }

  if (blockingSpinner && !profile) {
    return (
      <div>
        <PageHeader title="Log" subtitle="Food & nutrition" />
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {offline && (
        <div className="pointer-events-none fixed right-3 top-[calc(max(env(safe-area-inset-top,0px),16px)+10px)] z-50 rounded-full border border-line bg-surface/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted shadow-soft dark:bg-elevated">
          Offline
        </div>
      )}
      <PageHeader title="Log" subtitle="Track meals against your daily goals." />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">Calories</span>
              <span className="tabular-nums text-muted">
                {Math.round(totals.c)} / {goalsReady ? calGoal : "—"} kcal
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-line/15 dark:bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out"
                style={{
                  width: goalsReady && calGoal ? `${Math.min(100, (totals.c / calGoal) * 100)}%` : "0%",
                }}
              />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">Protein</span>
              <span className="tabular-nums text-muted">
                {Math.round(totals.p)}g / {goalsReady ? `${protGoal}g` : "—"} protein
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-line/15 dark:bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out"
                style={{
                  width: goalsReady && protGoal ? `${Math.min(100, (totals.p / protGoal) * 100)}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>

        <Card id="log" className="scroll-mt-28 space-y-4 p-4 md:scroll-mt-24">
          <h2 className="font-display text-lg font-semibold text-ink">Add entry</h2>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={addEntry}>
            <div className="sm:col-span-2">
              <Label>Food name</Label>
              <Input className="min-h-[48px]" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Calories</Label>
              <Input type="number" className="min-h-[48px]" value={cal} onChange={(e) => setCal(e.target.value)} />
            </div>
            <div>
              <Label>Protein (g)</Label>
              <Input type="number" className="min-h-[48px]" value={prot} onChange={(e) => setProt(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="min-h-[48px] w-full sm:w-auto" disabled={saving}>
                {saving ? "Adding…" : "Add entry"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-0">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold text-ink">Today&apos;s log</h2>
          </div>
          <ul className="divide-y divide-line/80">
            {rows.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">No entries yet.</li>
            )}
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{r.name}</p>
                  <p className="text-xs text-muted">
                    {r.calories} kcal · {r.protein_g}g protein · {format(new Date(r.logged_at), "h:mm a")}
                  </p>
                </div>
                <Button type="button" variant="ghost" className="min-h-[44px] text-red-600" onClick={() => void remove(r.id)}>
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
