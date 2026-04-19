import type { PlanExercise, PlanExerciseType } from "@/types";

export function newExerciseId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

export function newPlanExercise(partial?: Partial<PlanExercise>): PlanExercise {
  return {
    id: newExerciseId(),
    name: "",
    sets: 3,
    reps: 10,
    restSeconds: 60,
    exerciseType: "reps",
    toFailure: false,
    durationSeconds: 60,
    ...partial,
  };
}

export function exerciseKind(ex: PlanExercise): PlanExerciseType {
  return ex.exerciseType === "timed" ? "timed" : "reps";
}

export function normalizePlanExercise(raw: PlanExercise): PlanExercise {
  const kind = raw.exerciseType === "timed" ? "timed" : "reps";
  const sets = Math.max(1, Math.floor(Number(raw.sets) || 1));
  const reps = Math.max(1, Math.floor(Number(raw.reps) || 1));
  const restSeconds = Math.max(1, Math.floor(Number(raw.restSeconds) || 60));
  const durationSeconds = Math.max(1, Math.floor(Number(raw.durationSeconds) || 60));
  return {
    id: raw.id || newExerciseId(),
    name: (raw.name ?? "").trim() || "Exercise",
    sets,
    reps,
    restSeconds,
    exerciseType: kind,
    toFailure: kind === "reps" ? Boolean(raw.toFailure) : false,
    durationSeconds,
  };
}

export function formatExerciseTarget(ex: PlanExercise): string {
  if (exerciseKind(ex) === "timed") {
    const sec = Math.max(1, ex.durationSeconds ?? 60);
    return `${ex.sets} × ${sec}s`;
  }
  if (ex.toFailure) return `${ex.sets} × Failure`;
  return `${ex.sets} × ${ex.reps}`;
}

export function formatExerciseMetaLine(ex: PlanExercise): string {
  return `${formatExerciseTarget(ex)} · Rest ${ex.restSeconds ?? 60}s`;
}
