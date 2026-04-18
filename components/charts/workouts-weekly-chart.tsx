"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addWeeks, eachWeekOfInterval, format, startOfWeek, subWeeks } from "date-fns";
import type { Workout } from "@/types";

export function WorkoutsWeeklyChart({ workouts }: { workouts: Workout[] }) {
  const data = useMemo(() => {
    const end = startOfWeek(new Date(), { weekStartsOn: 1 });
    const start = subWeeks(end, 7);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    return weeks.map((w) => {
      const wEnd = addWeeks(w, 1);
      const count = workouts.filter((r) => {
        const d = new Date(r.date + "T12:00:00");
        return d >= w && d < wEnd;
      }).length;
      return {
        label: format(w, "MMM d"),
        count,
      };
    });
  }, [workouts]);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--line) / 0.12)" />
          <XAxis dataKey="label" tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} width={28} tick={{ fill: "rgb(var(--muted))", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgb(var(--gold) / 0.08)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgb(var(--line) / 0.12)",
              background: "rgb(var(--surface) / 0.95)",
              color: "rgb(var(--ink))",
            }}
            labelStyle={{ color: "rgb(var(--muted))" }}
          />
          <Bar dataKey="count" name="Workouts" fill="rgb(var(--gold))" radius={[8, 8, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
