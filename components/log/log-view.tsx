"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { FoodLog } from "@/types";
import { recomputeStreaks } from "@/lib/streak";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function LogView() {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const [rows, setRows] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [calGoal, setCalGoal] = useState(2500);
  const [protGoal, setProtGoal] = useState(140);
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [prot, setProt] = useState("");
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

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
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from("profiles").select("calorie_goal, protein_goal_g").eq("id", user.id).maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("date", today).order("logged_at", { ascending: false }),
    ]);
    if (p) {
      setCalGoal(p.calorie_goal ?? 2500);
      setProtGoal(p.protein_goal_g ?? 140);
    }
    setRows((f ?? []) as FoodLog[]);
    setLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const c = rows.reduce((a, r) => a + r.calories, 0);
    const p = rows.reduce((a, r) => a + Number(r.protein_g), 0);
    return { c, p };
  }, [rows]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const calories = Number(cal);
    const protein = Number(prot);
    if (!name.trim() || !Number.isFinite(calories) || !Number.isFinite(protein)) {
      toast.error("Fill food name, calories, and protein.");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      date: today,
      name: name.trim(),
      calories: Math.round(calories),
      protein_g: protein,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Logged");
      setName("");
      setCal("");
      setProt("");
      await load();
      await recomputeStreaks(supabase, user.id);
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("food_logs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      await load();
      if (user) await recomputeStreaks(supabase, user.id);
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

  return (
    <div>
      <PageHeader title="Log" subtitle="Track meals against your daily goals." />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Card className="p-4">
          <p className="text-center text-sm text-muted">Today</p>
          <p className="mt-1 text-center font-display text-xl font-bold text-gold">
            {Math.round(totals.c)} / {calGoal} kcal · {Math.round(totals.p)}g / {protGoal}g protein
          </p>
        </Card>

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
            {loading && <Skeleton className="m-4 h-24" />}
            {!loading && rows.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">No entries yet.</li>
            )}
            {!loading &&
              rows.map((r) => (
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
