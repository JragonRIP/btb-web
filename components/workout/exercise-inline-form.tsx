"use client";

import { useMemo, useState } from "react";
import type { PlanExercise, PlanExerciseType } from "@/types";
import { newPlanExercise, normalizePlanExercise } from "@/lib/plan-exercise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PositiveIntInput } from "@/components/workout/positive-int-input";

type Props = {
  initial?: PlanExercise | null;
  submitLabel?: string;
  onSubmit: (ex: PlanExercise) => void;
  onCancel?: () => void;
};

export function ExerciseInlineForm({ initial, submitLabel = "Add", onSubmit, onCancel }: Props) {
  const seed = useMemo(() => (initial ? { ...initial } : newPlanExercise()), [initial]);
  const [name, setName] = useState(seed.name);
  const [exerciseType, setExerciseType] = useState<PlanExerciseType>(seed.exerciseType === "timed" ? "timed" : "reps");
  const [sets, setSets] = useState(seed.sets);
  const [reps, setReps] = useState(seed.reps);
  const [toFailure, setToFailure] = useState(Boolean(seed.toFailure));
  const [durationSeconds, setDurationSeconds] = useState(seed.durationSeconds ?? 60);
  const [restSeconds, setRestSeconds] = useState(seed.restSeconds);

  function handleSubmit() {
    const base = initial ?? newPlanExercise();
    const row = normalizePlanExercise({
      ...base,
      name: name.trim() || "Exercise",
      exerciseType,
      sets,
      reps,
      toFailure: exerciseType === "reps" ? toFailure : false,
      durationSeconds,
      restSeconds,
    });
    onSubmit(row);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface/80 p-4 dark:bg-elevated/60">
      <div>
        <Label>Exercise name</Label>
        <Input className="mt-1 min-h-[44px]" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bench press" />
      </div>
      <div>
        <Label>Exercise type</Label>
        <Select
          className="mt-1 min-h-[44px]"
          value={exerciseType}
          onChange={(e) => setExerciseType(e.target.value as PlanExerciseType)}
        >
          <option value="reps">Reps</option>
          <option value="timed">Timed</option>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Sets</Label>
          <PositiveIntInput className="mt-1 min-h-[44px]" value={sets} min={1} onValueChange={setSets} />
        </div>
        {exerciseType === "reps" ? (
          <div>
            <Label>Reps</Label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-gold"
                  checked={toFailure}
                  onChange={(e) => setToFailure(e.target.checked)}
                />
                To failure
              </label>
              {toFailure ? (
                <p className="flex min-h-[44px] flex-1 items-center rounded-xl border border-line bg-elevated/40 px-3 font-semibold text-gold">
                  Failure
                </p>
              ) : (
                <PositiveIntInput className="min-h-[44px]" value={reps} min={1} onValueChange={setReps} />
              )}
            </div>
          </div>
        ) : (
          <div>
            <Label>Duration (seconds)</Label>
            <PositiveIntInput className="mt-1 min-h-[44px]" value={durationSeconds} min={1} onValueChange={setDurationSeconds} />
          </div>
        )}
      </div>
      <div>
        <Label>Rest timer (seconds)</Label>
        <PositiveIntInput className="mt-1 min-h-[44px]" value={restSeconds} min={1} onValueChange={setRestSeconds} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-[44px] flex-1" onClick={handleSubmit}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" className="min-h-[44px] flex-1" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
