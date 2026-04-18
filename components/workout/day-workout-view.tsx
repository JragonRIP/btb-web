"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { DayWorkoutPanel } from "@/components/workout/day-workout-panel";

function DayWorkoutInner({ dow }: { dow: number }) {
  const search = useSearchParams();
  const dateStr = search.get("date") ?? format(new Date(), "yyyy-MM-dd");
  return <DayWorkoutPanel dow={dow} dateStr={dateStr} layout="page" />;
}

export function DayWorkoutView({ dow }: { dow: number }) {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <DayWorkoutInner dow={dow} />
    </Suspense>
  );
}
