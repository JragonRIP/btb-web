"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import type { SleepLog } from "@/types";

export function SleepDurationChart({ rows }: { rows: SleepLog[] }) {
  const data = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 13);
    const days: { key: string; label: string; hours: number | null }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = subDays(end, 13 - i);
      const key = format(d, "yyyy-MM-dd");
      days.push({ key, label: format(d, "EEE M d"), hours: null });
    }
    const byDate = new Map(rows.map((r) => [r.date, r]));
    return days.map((d) => {
      const log = byDate.get(d.key);
      const hours = log?.duration_hours != null ? Number(log.duration_hours) : null;
      return { ...d, hours };
    });
  }, [rows]);

  const hasAny = data.some((d) => d.hours != null);
  if (!hasAny) {
    return <p className="py-10 text-center text-sm text-muted">Log sleep to chart your nights.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--gold))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgb(var(--gold))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--line) / 0.12)" />
          <XAxis dataKey="label" tick={{ fill: "rgb(var(--muted))", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
          <YAxis
            width={36}
            tick={{ fill: "rgb(var(--muted))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}h`}
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
              return Number.isFinite(n) ? [`${n} h`, "Duration"] : ["—", "Duration"];
            }}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="rgb(var(--gold))"
            fill="url(#sleepFill)"
            strokeWidth={2}
            connectNulls
            dot={{ r: 2, strokeWidth: 0, fill: "rgb(var(--gold))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
