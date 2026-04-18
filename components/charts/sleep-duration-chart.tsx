"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import type { SleepLog } from "@/types";

export function SleepDurationChart({ rows, sleepGoalHours }: { rows: SleepLog[]; sleepGoalHours: number }) {
  const data = useMemo(() => {
    const end = new Date();
    const days: { key: string; label: string; hours: number | null; hit: boolean }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = subDays(end, 13 - i);
      const key = format(d, "yyyy-MM-dd");
      days.push({ key, label: format(d, "EEE d"), hours: null, hit: false });
    }
    const byDate = new Map(rows.map((r) => [r.date, r]));
    return days.map((d) => {
      const log = byDate.get(d.key);
      const hours = log?.duration_hours != null ? Number(log.duration_hours) : null;
      const hit = hours != null && hours >= sleepGoalHours;
      return { ...d, hours, hit };
    });
  }, [rows, sleepGoalHours]);

  const hasAny = data.some((d) => d.hours != null);
  if (!hasAny) {
    return <p className="py-10 text-center text-sm text-muted">Log sleep to chart your nights.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--line) / 0.12)" />
          <XAxis dataKey="label" tick={{ fill: "rgb(var(--muted))", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
          <YAxis
            width={36}
            tick={{ fill: "rgb(var(--muted))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}h`}
          />
          <ReferenceLine
            y={sleepGoalHours}
            stroke="rgb(var(--gold))"
            strokeDasharray="4 4"
            label={{ value: "Goal", fill: "rgb(var(--muted))", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgb(var(--line) / 0.12)",
              background: "rgb(var(--surface) / 0.95)",
              color: "rgb(var(--ink))",
            }}
            labelFormatter={(_, p) => {
              const row = (p as { payload?: { key?: string } } | undefined)?.payload;
              if (row?.key) return format(parseISO(row.key), "EEEE, MMM d");
              return "";
            }}
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return Number.isFinite(n) ? [`${n} h`, "Sleep"] : ["—", "Sleep"];
            }}
          />
          <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.hours == null
                    ? "rgb(var(--line) / 0.15)"
                    : entry.hit
                      ? "rgb(var(--gold))"
                      : "rgb(var(--muted) / 0.45)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
