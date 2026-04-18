"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { format, subWeeks } from "date-fns";
import { toast } from "sonner";
import { LogOut, Moon, Monitor, Sun } from "lucide-react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import type { Profile } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  WeeklySummaryModal,
  buildWeeklySummaryStats,
  type WeeklySummaryStats,
} from "@/components/summary/weekly-summary-modal";

export function SettingsView() {
  const { client: supabase } = useSupabaseBrowser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryStats, setSummaryStats] = useState<WeeklySummaryStats | null>(null);

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [cal, setCal] = useState("");
  const [prot, setProt] = useState("");
  const [sleep, setSleep] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);

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
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const p = data as Profile | null;
    setProfile(p);
    if (p) {
      setName(p.name ?? "");
      setWeight(p.weight_lbs != null ? String(p.weight_lbs) : "");
      setCal(String(p.calorie_goal ?? 2500));
      setProt(String(p.protein_goal_g ?? 140));
      setSleep(String(p.sleep_goal_hours ?? 9));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile() {
    if (!supabase) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const w = weight.trim() === "" ? null : Number(weight);
    const patch = {
      id: user.id,
      name: name.trim() || null,
      weight_lbs: w != null && Number.isFinite(w) ? w : null,
      calorie_goal: Math.round(Number(cal) || 2500),
      protein_goal_g: Math.round(Number(prot) || 140),
      sleep_goal_hours: Number(sleep) || 9,
    };
    const { error } = await supabase.from("profiles").upsert(patch, { onConflict: "id" });
    if (error) toast.error(error.message);
    else {
      if (w != null && Number.isFinite(w)) {
        await supabase.from("weight_logs").insert({
          user_id: user.id,
          date: format(new Date(), "yyyy-MM-dd"),
          weight_lbs: w,
        });
      }
      toast.success("Profile saved");
      await load();
    }
    setSaving(false);
  }

  async function openLastSummary() {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const anchor = subWeeks(new Date(), 1);
    const stats = await buildWeeklySummaryStats(supabase, user.id, anchor);
    setSummaryStats(stats);
    setSummaryOpen(true);
  }

  async function signOut() {
    const client = createSupabaseBrowserClient();
    const { error } = await client.auth.signOut();
    if (error) toast.error(error.message);
    else {
      router.push("/auth/login");
      router.refresh();
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile, appearance, and training." />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Profile</h2>
              <Card className="space-y-4 p-4">
                <div>
                  <Label>Name</Label>
                  <Input className="min-h-[48px]" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Current weight (lbs)</Label>
                  <Input className="min-h-[48px]" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Calorie goal / day</Label>
                    <Input className="min-h-[48px]" type="number" value={cal} onChange={(e) => setCal(e.target.value)} />
                  </div>
                  <div>
                    <Label>Protein goal (g)</Label>
                    <Input className="min-h-[48px]" type="number" value={prot} onChange={(e) => setProt(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Sleep goal (hours)</Label>
                  <Input className="min-h-[48px]" type="number" step={0.25} value={sleep} onChange={(e) => setSleep(e.target.value)} />
                </div>
                <Button type="button" className="min-h-[48px]" disabled={saving} onClick={() => void saveProfile()}>
                  {saving ? "Saving…" : "Save profile"}
                </Button>
              </Card>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Appearance</h2>
              <Card className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  <ThemeChip active={mounted && theme === "light"} icon={Sun} label="Light" onClick={() => setTheme("light")} />
                  <ThemeChip active={mounted && theme === "dark"} icon={Moon} label="Dark" onClick={() => setTheme("dark")} />
                  <ThemeChip
                    active={mounted && theme === "system"}
                    icon={Monitor}
                    label="System"
                    onClick={() => setTheme("system")}
                  />
                </div>
              </Card>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Workouts</h2>
              <Card className="p-4">
                <Link href="/settings/weekly-workouts">
                  <Button type="button" variant="secondary" className="min-h-[48px] w-full">
                    Edit weekly workouts
                  </Button>
                </Link>
              </Card>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Weekly summary</h2>
              <Card className="p-4">
                <Button type="button" variant="secondary" className="min-h-[48px] w-full" onClick={() => void openLastSummary()}>
                  View last weekly summary
                </Button>
              </Card>
            </section>

            <Button type="button" variant="ghost" className="min-h-[48px] w-full gap-2 text-red-600" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </>
        )}
      </div>

      <WeeklySummaryModal
        open={summaryOpen}
        stats={summaryStats}
        onDismiss={() => setSummaryOpen(false)}
      />
    </div>
  );
}

function ThemeChip({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Sun;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-medium transition",
        active ? "border-gold/50 bg-gold/10 text-ink dark:text-white" : "border-line bg-surface text-muted dark:bg-elevated/60"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
