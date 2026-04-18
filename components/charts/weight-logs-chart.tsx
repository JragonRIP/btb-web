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
import type { WeightLog } from "@/types";

export function WeightLogsChart({ rows }: { rows: WeightLog[] }) {
  const { data, trend } = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const pts = sorted.map((r) => ({
      date: r.date,
      label: format(parseISO(r.date + "T12:00:00"), "MMM d"),
      w: Number(r.weight_lbs),
    }));
    let trend: "Gaining" | "Cutting" | "Maintaining" = "Maintaining";
    if (pts.length >= 2) {
      const d = pts[pts.length - 1].w - pts[0].w;
      if (d > 0.5) trend = "Gaining";
      else if (d < -0.5) trend = "Cutting";
    }
    return { data: pts, trend };
  }, [rows]);

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted">Log weight to see trajectory.</p>;
  }

  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gold">{trend}</p>
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
              formatter={(v: number) => [`${v} lbs`, "Weight"]}
            />
            <Line
              type="monotone"
              dataKey="w"
              stroke="rgb(var(--gold))"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "rgb(var(--gold))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
