"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import type { Profile } from "@/types";
import { writeProfileCache } from "@/lib/btb-local-cache";

const SLEEP_MIN = 6;
const SLEEP_MAX = 10;

export function OnboardingFlow() {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("2500");
  const [protein, setProtein] = useState("140");
  const [sleepHours, setSleepHours] = useState(9);

  async function upsertProfile(partial: Record<string, unknown>) {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert(
      { id: user.id, ...partial },
      { onConflict: "id" }
    );
    if (error) throw error;
  }

  async function persistWeightLog(w: number) {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    await supabase.from("weight_logs").insert({
      user_id: user.id,
      date: today,
      weight_lbs: w,
    });
  }

  async function goNext() {
    if (!supabase) return;
    setBusy(true);
    try {
      if (step === 1) {
        if (!name.trim()) {
          toast.error("Please enter your name.");
          setBusy(false);
          return;
        }
        await upsertProfile({ name: name.trim() });
      }
      if (step === 2) {
        const w = Number(weight);
        if (!Number.isFinite(w) || w <= 0) {
          toast.error("Enter a valid weight in lbs.");
          setBusy(false);
          return;
        }
        await upsertProfile({ weight_lbs: w });
        await persistWeightLog(w);
      }
      if (step === 3) {
        const c = Number(calories);
        if (!Number.isFinite(c) || c < 500) {
          toast.error("Enter a realistic calorie goal.");
          setBusy(false);
          return;
        }
        await upsertProfile({ calorie_goal: Math.round(c) });
      }
      if (step === 4) {
        const p = Number(protein);
        if (!Number.isFinite(p) || p < 20) {
          toast.error("Enter a protein goal in grams.");
          setBusy(false);
          return;
        }
        await upsertProfile({ protein_goal_g: Math.round(p) });
      }
      if (step === 5) {
        await upsertProfile({ sleep_goal_hours: sleepHours });
      }
      setStep((s) => s + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
    setBusy(false);
  }

  async function finish(goSetup: boolean) {
    if (!supabase) return;
    setBusy(true);
    try {
      await upsertProfile({ onboarding_completed: true });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: full } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (full) writeProfileCache(user.id, full as Profile);
      }
      toast.success("You're all set!");
      router.push(goSetup ? "/workout/setup-flow" : "/home");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not finish");
    }
    setBusy(false);
  }

  if (envError) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Card className="border-red-500/40 bg-red-500/5 p-4 text-sm">{envError}</Card>
      </div>
    );
  }

  if (!supabase) {
    return <div className="p-10 text-center text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col px-4 pb-24 pt-4">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold">Build The Body</p>
      <p className="mt-2 text-center text-sm text-muted">Step {step} of 6</p>

      {step === 1 && (
        <Card className="mt-8 p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">What&apos;s your name?</h2>
          <p className="mt-1 text-sm text-muted">We&apos;ll use this on your home screen.</p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="ob-name">Name</Label>
            <Input
              id="ob-name"
              autoFocus
              className="min-h-[48px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
            />
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="mt-8 p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">How much do you weigh?</h2>
          <p className="mt-1 text-sm text-muted">In pounds — you can update anytime.</p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="ob-w">Weight (lbs)</Label>
            <Input
              id="ob-w"
              type="number"
              inputMode="decimal"
              className="min-h-[48px]"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="185"
            />
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="mt-8 p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Daily calorie goal</h2>
          <p className="mt-1 text-sm text-muted">Rough target for nutrition tracking.</p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="ob-cal">Calories / day</Label>
            <Input
              id="ob-cal"
              type="number"
              className="min-h-[48px]"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="mt-8 p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Daily protein goal</h2>
          <p className="mt-1 text-sm text-muted">In grams.</p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="ob-p">Protein (g)</Label>
            <Input
              id="ob-p"
              type="number"
              className="min-h-[48px]"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card className="mt-8 p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Sleep goal</h2>
          <p className="mt-1 text-sm text-muted">How many hours do you want to aim for?</p>
          <div className="mt-8 space-y-4">
            <input
              type="range"
              min={SLEEP_MIN}
              max={SLEEP_MAX}
              step={0.25}
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="h-12 w-full accent-gold"
            />
            <p className="text-center font-display text-2xl font-semibold text-gold">
              {sleepHours} hrs{sleepHours === 9 ? " — Recommended" : ""}
            </p>
          </div>
        </Card>
      )}

      {step === 6 && (
        <Card className="mt-8 p-6">
          <h2 className="font-display text-2xl font-semibold text-ink">Weekly workout schedule</h2>
          <p className="mt-1 text-sm text-muted">You can always change this later in Settings.</p>
          <div className="mt-8 flex flex-col gap-3">
            <Button type="button" className="min-h-[48px]" disabled={busy} onClick={() => void finish(true)}>
              Set up your workouts now
            </Button>
            <Button type="button" variant="secondary" className="min-h-[48px]" disabled={busy} onClick={() => void finish(false)}>
              I&apos;ll do it later
            </Button>
          </div>
        </Card>
      )}

      {step < 6 && (
        <div className="mt-8 flex justify-end">
          <Button type="button" className="min-h-[48px] min-w-[120px]" disabled={busy} onClick={() => void goNext()}>
            {busy ? "Saving…" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}
