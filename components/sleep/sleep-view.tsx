"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { format, parseISO, startOfDay, subDays } from "date-fns";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import type { Profile, SleepLog } from "@/types";
import { computeSleepDurationHours } from "@/lib/sleep-duration";
import { dbTimeToDisplay, dbTimeToInput } from "@/lib/sleep-time-format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";
import {
  BTB_BOOT_SPINNER_MS,
  readProfileCache,
  readSleepListCache,
  writeProfileCache,
  writeSleepListCache,
} from "@/lib/btb-local-cache";

const DOW_LETTER = ["S", "M", "T", "W", "T", "F", "S"] as const;

function qualityDotClass(q: number | null) {
  if (q == null) return "bg-line/40";
  if (q <= 1) return "bg-red-500";
  if (q === 2) return "bg-orange-500";
  if (q === 3) return "bg-gold";
  if (q === 4) return "bg-emerald-500";
  return "bg-emerald-400";
}

export function SleepView() {
  const { client: supabase, error: supabaseInitError } = useSupabaseBrowser();
  const [rows, setRows] = useState<SleepLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blockingSpinner, setBlockingSpinner] = useState(true);
  const [dataBootstrapped, setDataBootstrapped] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [bedtime, setBedtime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState("4");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const logCardRef = useRef<HTMLDivElement>(null);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededForm = useRef(false);
  const aliveRef = useRef(true);
  const [sleepBarsKey, setSleepBarsKey] = useState(0);
  const sleepBarsPrimed = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const sleepGoalHours = profile?.sleep_goal_hours ?? 9;

  const previewHours = useMemo(() => computeSleepDurationHours(bedtime, wakeTime), [bedtime, wakeTime]);

  const totalTone = useMemo(() => {
    if (previewHours == null) return "text-muted";
    if (previewHours >= sleepGoalHours) return "text-emerald-400";
    if (previewHours >= sleepGoalHours - 1) return "text-gold";
    return "text-red-400/90";
  }, [previewHours, sleepGoalHours]);

  const last7Days = useMemo(() => {
    const end = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => subDays(end, 6 - i));
  }, []);

  const logForDate = useCallback(
    (ds: string) => {
      return rows.find((r) => r.date === ds);
    },
    [rows]
  );

  const openDay = useCallback(
    (d: Date, opts?: { scroll?: boolean }) => {
      const scroll = opts?.scroll !== false;
      const ds = format(d, "yyyy-MM-dd");
      setDate(ds);
      const hit = rows.find((r) => r.date === ds);
      if (hit) {
        setEditingId(hit.id);
        setBedtime(dbTimeToInput(hit.bedtime));
        setWakeTime(dbTimeToInput(hit.wake_time));
        setQuality(String(hit.quality ?? 4));
        setNotes(hit.notes ?? "");
      } else {
        setEditingId(null);
        setBedtime("22:30");
        setWakeTime("07:00");
        setQuality("4");
        setNotes("");
      }
      if (scroll) {
        requestAnimationFrame(() => logCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    },
    [rows]
  );

  const refreshRemote = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      if (aliveRef.current) {
        setBlockingSpinner(false);
        setDataBootstrapped(true);
      }
      return;
    }

    const pCached = readProfileCache(user.id);
    const sCached = readSleepListCache(user.id);
    if (pCached?.v) setProfile(pCached.v);
    if (sCached?.v?.length) setRows(sCached.v);

    const hadCache = Boolean(pCached?.v) || Boolean(sCached?.v?.length);
    if (hadCache) setBlockingSpinner(false);
    else {
      setBlockingSpinner(true);
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = setTimeout(() => setBlockingSpinner(false), BTB_BOOT_SPINNER_MS);
    }

    try {
      const [{ data: prof, error: pe }, { data, error: sleepErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("sleep_logs").select("*").order("date", { ascending: false }).limit(200),
      ]);
      if (pe) throw pe;
      if (sleepErr) throw sleepErr;
      if (!aliveRef.current) return;

      if (prof) {
        const pr = prof as Profile;
        setProfile(pr);
        writeProfileCache(user.id, pr);
      }
      const list = (data ?? []) as SleepLog[];
      setRows(list);
      writeSleepListCache(user.id, list);
      setOffline(false);
    } catch {
      if (aliveRef.current) setOffline(true);
    } finally {
      if (spinnerTimerRef.current) {
        clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
      }
      if (aliveRef.current) {
        setBlockingSpinner(false);
        setDataBootstrapped(true);
      }
    }
  }, [supabase]);

  useEffect(() => {
    if (supabase) void refreshRemote();
  }, [refreshRemote, supabase]);

  useEffect(() => {
    if (!dataBootstrapped || blockingSpinner) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setAnimReady(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [dataBootstrapped, blockingSpinner]);

  useEffect(() => {
    if (!animReady || sleepBarsPrimed.current) return;
    sleepBarsPrimed.current = true;
    const id = requestAnimationFrame(() => setSleepBarsKey(1));
    return () => cancelAnimationFrame(id);
  }, [animReady]);

  useEffect(() => {
    if (!rows.length || seededForm.current) return;
    seededForm.current = true;
    openDay(new Date(), { scroll: false });
  }, [rows, openDay]);

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
    const bed = bedtime.length === 5 ? `${bedtime}:00` : bedtime;
    const wake = wakeTime.length === 5 ? `${wakeTime}:00` : wakeTime;
    const payload = {
      user_id: user.id,
      date,
      bedtime: bed,
      wake_time: wake,
      duration_hours,
      quality: q,
      notes: notes.trim() === "" ? null : notes.trim(),
    };

    const { data: existing } = await supabase.from("sleep_logs").select("id").eq("user_id", user.id).eq("date", date).maybeSingle();

    const targetId = editingId ?? existing?.id ?? null;
    const { error } = targetId
      ? await supabase
          .from("sleep_logs")
          .update({
            bedtime: bed,
            wake_time: wake,
            duration_hours,
            quality: q,
            notes: payload.notes,
          })
          .eq("id", targetId)
      : await supabase.from("sleep_logs").insert(payload);

    if (error) toast.error(error.message);
    else {
      toast.success("Sleep saved");
      setNotes("");
      await refreshRemote();
    }
    setSaving(false);
  }

  async function removeRow(id: string) {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const prev = rows;
    const deleted = prev.find((x) => x.id === id);
    const next = prev.filter((x) => x.id !== id);
    setRows(next);
    writeSleepListCache(user.id, next);
    const { error } = await supabase.from("sleep_logs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      setRows(prev);
      writeSleepListCache(user.id, prev);
    } else {
      toast.success("Deleted");
      await refreshRemote();
      if (deleted?.date === date) {
        setDate(todayStr);
        setEditingId(null);
        setBedtime("22:30");
        setWakeTime("07:00");
        setQuality("4");
        setNotes("");
      }
    }
  }

  function fmtTime(t: string | null) {
    return dbTimeToDisplay(t);
  }

  if (supabaseInitError) {
    return (
      <div className={cn("px-4 pb-10 pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)]")}>
        <p className="text-sm text-red-600">{supabaseInitError}</p>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className={cn("px-4 pb-10 pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)]")}>
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (blockingSpinner && rows.length === 0 && !profile) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" aria-hidden />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-6 pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)] md:pb-8">
      {offline && (
        <div className="pointer-events-none fixed right-3 top-[calc(max(env(safe-area-inset-top,0px),16px)+10px)] z-50 rounded-full border border-line bg-surface/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted shadow-soft dark:bg-elevated">
          Offline
        </div>
      )}

      <header className="mb-12">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">SLEEP</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Editable until midnight. We color-code recovery quality.
        </p>
      </header>

      <form onSubmit={onSubmit}>
        <div ref={logCardRef} id="sleep-log" className="scroll-mt-28 space-y-10 md:scroll-mt-24">
          <div className="grid grid-cols-2 gap-4">
            <label className="relative block min-h-[44px] cursor-pointer rounded-2xl border border-line bg-canvas/50 p-5 dark:bg-canvas/30">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Bedtime</span>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-sans text-2xl font-bold leading-none text-ink">{dbTimeToDisplay(bedtime)}</span>
                <Clock className="h-5 w-5 shrink-0 text-gold" aria-hidden />
              </div>
              <input
                type="time"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                value={dbTimeToInput(bedtime)}
                onChange={(e) => setBedtime(e.target.value)}
                aria-label="Bedtime"
              />
            </label>
            <label className="relative block min-h-[44px] cursor-pointer rounded-2xl border border-line bg-canvas/50 p-5 dark:bg-canvas/30">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Wake time</span>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-sans text-2xl font-bold leading-none text-ink">{dbTimeToDisplay(wakeTime)}</span>
                <Clock className="h-5 w-5 shrink-0 text-gold" aria-hidden />
              </div>
              <input
                type="time"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                value={dbTimeToInput(wakeTime)}
                onChange={(e) => setWakeTime(e.target.value)}
                aria-label="Wake time"
              />
            </label>
          </div>

          <div className="px-1 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Total</p>
            <p className={cn("mt-3 font-sans text-3xl font-bold uppercase tracking-tight md:text-4xl", totalTone)}>
              {previewHours != null ? `${previewHours} hours` : "—"}
            </p>
          </div>

          <div className="border-t border-line/30">
            <button
              type="button"
              className="flex w-full min-h-[48px] items-center justify-between gap-3 py-4 text-left transition hover:opacity-80"
              onClick={() => setQualityOpen((o) => !o)}
              aria-expanded={qualityOpen}
            >
              <span className="text-sm font-medium text-ink">Quality &amp; notes</span>
              {qualityOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
              )}
            </button>
            {qualityOpen && (
              <div className="grid gap-6 pb-2 pt-1">
                <div>
                  <Label htmlFor="s-q">Quality (1–5)</Label>
                  <Select id="s-q" className="mt-2 min-h-[44px]" value={quality} onChange={(e) => setQuality(e.target.value)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} — {["Poor", "Fair", "OK", "Good", "Excellent"][n - 1]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="s-notes">Notes</Label>
                  <Textarea
                    id="s-notes"
                    className="mt-2 min-h-[88px]"
                    placeholder="Dreams, disruptions, caffeine…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="mt-6 min-h-[48px] w-full rounded-xl bg-gold text-zinc-950 shadow-none ring-0 hover:brightness-[1.03] hover:shadow-none active:scale-100 dark:text-white"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save sleep"}
          </Button>
        </div>
      </form>

      <div className="my-14 border-0 border-t border-line/25" aria-hidden />

      <section className="mt-0">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted">Last 7 nights</h2>
        <div className="mt-6 flex gap-3">
          {last7Days.map((d, i) => {
            const ds = format(d, "yyyy-MM-dd");
            const log = logForDate(ds);
            const hours = log?.duration_hours != null ? Number(log.duration_hours) : null;
            const pct = hours != null && sleepGoalHours > 0 ? Math.min(100, (hours / sleepGoalHours) * 100) : 0;
            const met = hours != null && hours >= sleepGoalHours;
            const logged = hours != null;
            const fillClass = !logged ? "bg-line/25" : met ? "bg-emerald-500" : "bg-gold";
            const isToday = ds === todayStr;
            const letter = DOW_LETTER[d.getDay()];
            return (
              <button
                key={ds}
                type="button"
                onClick={() => openDay(d)}
                className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center gap-2 rounded-xl p-1 transition hover:bg-elevated/50"
              >
                <div className="relative flex h-40 w-full max-w-[52px] flex-col justify-end overflow-hidden rounded-2xl bg-line/15 dark:bg-black/30">
                  <div
                    className={cn(
                      "w-full rounded-t-2xl",
                      fillClass,
                      animReady && logged && sleepBarsKey > 0 && !reducedMotion && "btb-sleep-bar-fill"
                    )}
                    style={
                      {
                        height: logged ? `${Math.max(8, pct)}%` : "4px",
                        ["--btb-si" as string]: i,
                      } as CSSProperties
                    }
                  />
                </div>
                <span className={cn("text-[10px] font-semibold", isToday ? "text-gold" : "text-muted")}>{letter}</span>
                <span className="text-[10px] text-muted">{hours != null ? `${hours}h` : "—"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-lg font-semibold text-ink">History</h2>
        <ul className="mt-6 divide-y divide-line/60">
          {rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No sleep logs yet.</li>}
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="min-h-[44px] text-left"
                onClick={() => openDay(parseISO(`${r.date}T12:00:00`))}
              >
                <p className="text-sm font-medium text-ink">{format(parseISO(`${r.date}T12:00:00`), "MMM d, yyyy")}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", qualityDotClass(r.quality))} aria-hidden />
                  <span>
                    {fmtTime(r.bedtime)} → {fmtTime(r.wake_time)}
                    {r.duration_hours != null ? ` · ${r.duration_hours} h` : ""}
                  </span>
                </p>
                {r.notes && <p className="mt-1 text-sm text-muted">{r.notes}</p>}
              </button>
              <Button variant="ghost" type="button" className="min-h-[44px] self-start text-red-600" onClick={() => void removeRow(r.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
