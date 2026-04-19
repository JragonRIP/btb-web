"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { PersonalRecord, WeightLog } from "@/types";
import { WeightLogsChart } from "@/components/charts/weight-logs-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function score(w: number | null, r: number | null) {
  if (w == null || r == null) return 0;
  return w * r;
}

export function PrsView() {
  const { client: supabase } = useSupabaseBrowser();
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [confettiOn, setConfettiOn] = useState(false);
  const [cardCelebrate, setCardCelebrate] = useState(false);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      if (aliveRef.current) setLoading(false);
      return;
    }
    const [{ data: p }, { data: w }] = await Promise.all([
      supabase.from("personal_records").select("*").eq("user_id", user.id).order("achieved_at", { ascending: false }),
      supabase.from("weight_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(120),
    ]);
    if (!aliveRef.current) return;
    setPrs((p ?? []) as PersonalRecord[]);
    setWeights((w ?? []) as WeightLog[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addPr(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const w = Number(weight);
    const r = Number(reps);
    if (!exercise.trim() || !Number.isFinite(w) || !Number.isFinite(r)) {
      toast.error("Exercise, weight, and reps are required.");
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
    const prev = prs.filter((p) => p.exercise_name.toLowerCase() === exercise.trim().toLowerCase());
    const best = prev.reduce((m, p) => Math.max(m, score(Number(p.weight_lbs), p.reps)), 0);
    const newScore = score(w, r);
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("personal_records").insert({
      user_id: user.id,
      exercise_name: exercise.trim(),
      weight_lbs: w,
      reps: Math.round(r),
      notes: note.trim() || null,
      achieved_at: today,
    });
    if (error) toast.error(error.message);
    else {
      if (newScore > best) {
        setCelebrate(exercise.trim());
        setConfettiOn(true);
        setCardCelebrate(true);
        window.setTimeout(() => setConfettiOn(false), 1500);
        window.setTimeout(() => setCardCelebrate(false), 650);
        window.setTimeout(() => setCelebrate(null), 2200);
      }
      toast.success("PR logged");
      setExercise("");
      setWeight("");
      setReps("");
      setNote("");
      await load();
    }
    setSaving(false);
  }

  const bestByExercise = useMemo(() => {
    const m = new Map<string, PersonalRecord>();
    for (const p of prs) {
      const key = p.exercise_name.toLowerCase();
      const cur = m.get(key);
      const ps = score(Number(p.weight_lbs), p.reps);
      const cs = cur ? score(Number(cur.weight_lbs), cur.reps) : -1;
      if (!cur || ps > cs) m.set(key, p);
    }
    return m;
  }, [prs]);

  if (!supabase) return null;

  return (
    <div className="relative">
      {confettiOn && (
        <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
          {Array.from({ length: 22 }).map((_, i) => {
            const spread = (i - 11) * 7;
            const tx = `${Math.sin(i * 0.55) * 110 + spread}px`;
            const ty = `${-70 - (i % 6) * 18 - Math.abs(spread) * 0.35}px`;
            const rot = `${i * 31 + 180}deg`;
            return (
              <span
                key={i}
                className="btb-confetti-piece absolute left-1/2 top-[32%] h-2.5 w-2 -translate-x-1/2 rounded-sm shadow-sm"
                style={
                  {
                    background: "linear-gradient(135deg, rgb(253 224 71), rgb(180 83 9))",
                    ["--tx" as string]: tx,
                    ["--ty" as string]: ty,
                    ["--rot" as string]: rot,
                    animationDelay: `${i * 16}ms`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      )}
      <PageHeader title="PRs" subtitle="Personal records & weight trajectory." />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {celebrate && (
          <div className="rounded-2xl border border-gold/45 bg-gold/10 px-4 py-3 text-center font-display text-base font-bold text-gold">
            New PR · {celebrate}
          </div>
        )}

        <Card className={cn("p-4", cardCelebrate && "btb-pr-card-celebrate")}>
          <h2 className="font-display text-lg font-semibold text-ink">Log a PR</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addPr}>
            <div className="sm:col-span-2">
              <Label>Exercise</Label>
              <Input className="min-h-[48px]" value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Bench press" />
            </div>
            <div>
              <Label>Weight (lbs)</Label>
              <Input type="number" className="min-h-[48px]" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <Label>Reps</Label>
              <Input type="number" className="min-h-[48px]" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="min-h-[48px]" disabled={saving}>
                {saving ? "Saving…" : "Save PR"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="font-display text-lg font-semibold text-ink">Current best by lift</h2>
          {loading ? (
            <Skeleton className="mt-4 h-24" />
          ) : (
            <ul className="mt-4 space-y-2">
              {[...bestByExercise.entries()].map(([k, p]) => (
                <li key={k} className="flex justify-between rounded-xl border border-line/60 px-3 py-2 text-sm">
                  <span className="font-medium capitalize text-ink">{p.exercise_name}</span>
                  <span className="text-gold">
                    {p.weight_lbs} lb × {p.reps}
                  </span>
                </li>
              ))}
              {bestByExercise.size === 0 && <p className="text-sm text-muted">No PRs yet.</p>}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-display text-lg font-semibold text-ink">Weight history</h2>
          {loading ? <Skeleton className="mt-4 h-56" /> : <WeightLogsChart rows={weights} />}
        </Card>

        <Card className="p-4">
          <h2 className="font-display text-lg font-semibold text-ink">History</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {prs.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-line/40 py-1">
                <span>{p.exercise_name}</span>
                <span className="text-muted">
                  {p.weight_lbs}×{p.reps} · {p.achieved_at}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
