"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Measurement } from "@/types";
import { WeightLineChart } from "@/components/charts/weight-line-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function MeasurementsView() {
  const { client: supabase, error: supabaseInitError } = useSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Measurement[]>([]);

  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [weight, setWeight] = useState("");
  const [bf, setBf] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("measurements").select("*").order("date", { ascending: false }).limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Measurement[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (supabase) void load();
  }, [load, supabase]);

  function numOrNull(v: string) {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setSaving(false);
      return;
    }
    const weight_lbs = numOrNull(weight);
    const body_fat_pct = numOrNull(bf);
    const chest_in = numOrNull(chest);
    const waist_in = numOrNull(waist);
    const hips_in = numOrNull(hips);
    if ([weight_lbs, body_fat_pct, chest_in, waist_in, hips_in].some((n) => n !== null && Number.isNaN(n))) {
      toast.error("Please enter valid numbers.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("measurements").insert({
      user_id: user.id,
      date,
      weight_lbs,
      body_fat_pct,
      chest_in,
      waist_in,
      hips_in,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Measurements saved");
      setWeight("");
      setBf("");
      setChest("");
      setWaist("");
      setHips("");
      await load();
    }
    setSaving(false);
  }

  async function removeRow(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("measurements").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      await load();
    }
  }

  if (supabaseInitError) {
    return (
      <div>
        <PageHeader title="Measurements" subtitle="Track composition and key circumferences over time." />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Card className="border-red-500/40 bg-red-500/5 p-4 text-sm text-ink">
            <p className="font-medium text-red-700 dark:text-red-300">Supabase configuration</p>
            <p className="mt-2 text-muted">{supabaseInitError}</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div>
        <PageHeader title="Measurements" subtitle="Track composition and key circumferences over time." />
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-10">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Measurements" subtitle="Track composition and key circumferences over time." />

      <div className="mx-auto max-w-3xl px-4 pb-10">
        <Card id="log" className="scroll-mt-28 p-4 md:scroll-mt-24">
          <CardTitle>Log entry</CardTitle>
          <CardDescription>Only the date is required — capture what you have.</CardDescription>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-date">Date</Label>
              <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-w">Weight (lbs)</Label>
              <Input id="m-w" inputMode="decimal" placeholder="185.4" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-bf">Body fat %</Label>
              <Input id="m-bf" inputMode="decimal" placeholder="14.2" value={bf} onChange={(e) => setBf(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-c">Chest (in)</Label>
              <Input id="m-c" inputMode="decimal" placeholder="42" value={chest} onChange={(e) => setChest(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-wa">Waist (in)</Label>
              <Input id="m-wa" inputMode="decimal" placeholder="32" value={waist} onChange={(e) => setWaist(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-h">Hips (in)</Label>
              <Input id="m-h" inputMode="decimal" placeholder="38" value={hips} onChange={(e) => setHips(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save measurements"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="mt-6 p-4">
          <CardTitle>Weight trend</CardTitle>
          <CardDescription>Line chart from your logged weights.</CardDescription>
          <div className="mt-4">{loading ? <Skeleton className="h-56 w-full" /> : <WeightLineChart rows={rows} />}</div>
        </Card>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="border-b border-line px-4 py-3">
            <CardTitle className="text-base">History</CardTitle>
            <CardDescription>Sorted by date, newest first.</CardDescription>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-elevated/60 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Wt</th>
                  <th className="px-4 py-2 font-medium">BF%</th>
                  <th className="px-4 py-2 font-medium">Ch</th>
                  <th className="px-4 py-2 font-medium">Wa</th>
                  <th className="px-4 py-2 font-medium">Hp</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/80">
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted">
                      No measurements yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-elevated/40">
                      <td className="px-4 py-3 font-medium text-ink">{r.date}</td>
                      <td className="px-4 py-3 text-muted">{r.weight_lbs ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{r.body_fat_pct ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{r.chest_in ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{r.waist_in ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{r.hips_in ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" type="button" className="text-red-600" onClick={() => void removeRow(r.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
