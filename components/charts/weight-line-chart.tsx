"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { Measurement } from "@/types";

export function WeightLineChart({ rows }: { rows: Measurement[] }) {
  const data = useMemo(() => {
    return [...rows]
      .filter((r) => r.weight_lbs != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: r.date,
        label: format(parseISO(r.date), "MMM d"),
        weight: Number(r.weight_lbs),
      }));
  }, [rows]);

  if (!data.length) {
    return <p className="py-10 text-center text-sm text-muted">Log weight to see your trend.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--line) / 0.12)" />
          <XAxis dataKey="label" tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={["auto", "auto"]}
            width={40}
            tick={{ fill: "rgb(var(--muted))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgb(var(--line) / 0.12)",
              background: "rgb(var(--surface) / 0.95)",
              color: "rgb(var(--ink))",
            }}
            labelStyle={{ color: "rgb(var(--muted))" }}
            formatter={(v: number) => [`${v} lbs`, "Weight"]}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="rgb(var(--gold))"
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: "rgb(var(--gold))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
