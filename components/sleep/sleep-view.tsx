"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { format } from "date-fns";
import { toast } from "sonner";
import type { SleepLog } from "@/types";
import { computeSleepDurationHours } from "@/lib/sleep-duration";
import { SleepDurationChart } from "@/components/charts/sleep-duration-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export function SleepView() {
  const supabase = useSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SleepLog[]>([]);

  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [bedtime, setBedtime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [quality, setQuality] = useState("4");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const previewHours = useMemo(
    () => computeSleepDurationHours(bedtime, wakeTime),
    [bedtime, wakeTime]
  );

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("sleep_logs").select("*").order("date", { ascending: false }).limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as SleepLog[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (supabase) void load();
  }, [load, supabase]);

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
    const duration_hours = computeSleepDurationHours(bedtime, wakeTime);
    const q = Number(quality);
    if (!Number.isFinite(q) || q < 1 || q > 5) {
      toast.error("Quality must be between 1 and 5.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("sleep_logs").insert({
      user_id: user.id,
      date,
      bedtime: bedtime.length === 5 ? `${bedtime}:00` : bedtime,
      wake_time: wakeTime.length === 5 ? `${wakeTime}:00` : wakeTime,
      duration_hours,
      quality: q,
      notes: notes.trim() === "" ? null : notes.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Sleep saved");
      setNotes("");
      await load();
    }
    setSaving(false);
  }

  async function removeRow(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("sleep_logs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      await load();
    }
  }

  function fmtTime(t: string | null) {
    if (!t) return "—";
    const parts = t.split(":");
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return t;
  }

  if (!supabase) {
    return (
      <div>
        <PageHeader title="Sleep" subtitle="Bedtime, wake time, subjective quality, and trends." />
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
      <PageHeader title="Sleep" subtitle="Bedtime, wake time, subjective quality, and trends." />

      <div className="mx-auto max-w-3xl px-4 pb-10">
        <Card id="log" className="scroll-mt-28 p-4 md:scroll-mt-24">
          <CardTitle>Log sleep</CardTitle>
          <CardDescription>Duration is calculated automatically from bed and wake times.</CardDescription>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="s-date">Date (wake day)</Label>
              <Input id="s-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-bed">Bedtime</Label>
              <Input id="s-bed" type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-wake">Wake time</Label>
              <Input id="s-wake" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-q">Quality (1–5)</Label>
              <Select id="s-q" value={quality} onChange={(e) => setQuality(e.target.value)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} — {["Poor", "Fair", "OK", "Good", "Excellent"][n - 1]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Calculated duration</Label>
              <div className="flex h-11 items-center rounded-xl border border-line bg-elevated/60 px-3 text-sm font-medium text-ink">
                {previewHours != null ? `${previewHours} hours` : "—"}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="s-notes">Notes</Label>
              <Textarea id="s-notes" placeholder="Dreams, disruptions, caffeine…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save sleep"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="mt-6 p-4">
          <CardTitle>Duration (14 nights)</CardTitle>
          <CardDescription>Recent sleep length per night.</CardDescription>
          <div className="mt-4">{loading ? <Skeleton className="h-56 w-full" /> : <SleepDurationChart rows={rows} />}</div>
        </Card>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="border-b border-line px-4 py-3">
            <CardTitle className="text-base">History</CardTitle>
            <CardDescription>Newest nights first.</CardDescription>
          </div>
          <ul className="divide-y divide-line/80">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <Skeleton className="h-12 w-full" />
                </li>
              ))}
            {!loading && rows.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted">No sleep logs yet.</li>
            )}
            {!loading &&
              rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{r.date}</p>
                    <p className="text-xs text-muted">
                      {fmtTime(r.bedtime)} → {fmtTime(r.wake_time)}
                      {r.duration_hours != null ? ` · ${r.duration_hours} h` : ""}
                      {r.quality != null ? ` · quality ${r.quality}/5` : ""}
                    </p>
                    {r.notes && <p className="mt-1 text-sm text-muted">{r.notes}</p>}
                  </div>
                  <Button variant="ghost" size="sm" type="button" className="self-start text-red-600" onClick={() => void removeRow(r.id)}>
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
