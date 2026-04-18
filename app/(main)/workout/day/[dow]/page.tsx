import { Suspense } from "react";
import { DayWorkoutView } from "@/components/workout/day-workout-view";

export default function WorkoutDayPage({ params }: { params: { dow: string } }) {
  const dow = Number.parseInt(params.dow, 10);
  if (Number.isNaN(dow) || dow < 0 || dow > 6) {
    return <p className="p-6 text-sm text-muted">Invalid day.</p>;
  }
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
      <DayWorkoutView dow={dow} />
    </Suspense>
  );
}
