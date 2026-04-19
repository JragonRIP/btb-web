export type WorkoutType = "strength" | "cardio" | "HIIT" | "yoga" | "other";

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  type: WorkoutType | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface Measurement {
  id: string;
  user_id: string;
  date: string;
  weight_lbs: number | null;
  body_fat_pct: number | null;
  chest_in: number | null;
  waist_in: number | null;
  hips_in: number | null;
  created_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;
  bedtime: string | null;
  wake_time: string | null;
  duration_hours: number | null;
  quality: number | null;
  notes: string | null;
  created_at: string;
}

export type ActivityItem =
  | { kind: "workout"; created_at: string; label: string; meta: string; id: string }
  | { kind: "measurement"; created_at: string; label: string; meta: string; id: string }
  | { kind: "sleep"; created_at: string; label: string; meta: string; id: string };

/** DB: 0=Sun … 6=Sat */
export type DayType = "workout" | "active_rest" | "full_rest";

export type PlanExerciseType = "reps" | "timed";

export interface PlanExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  /** Defaults to reps when absent (legacy rows). */
  exerciseType?: PlanExerciseType;
  toFailure?: boolean;
  /** Per set duration in seconds when exerciseType is timed. */
  durationSeconds?: number;
}

export interface Profile {
  id: string;
  name: string | null;
  weight_lbs: number | null;
  calorie_goal: number;
  protein_goal_g: number;
  sleep_goal_hours: number;
  onboarding_completed: boolean;
  current_streak: number;
  best_streak: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyWorkoutPlanRow {
  id?: string;
  user_id: string;
  day_of_week: number;
  muscle_group: string | null;
  day_type: DayType;
  exercises: PlanExercise[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  date: string;
  day_of_week: number;
  completed: boolean;
  rest_type: string | null;
  note: string | null;
  exercises_done: string[] | null;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  name: string;
  calories: number;
  protein_g: number;
  logged_at: string;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_name: string;
  weight_lbs: number | null;
  reps: number | null;
  notes: string | null;
  achieved_at: string;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_lbs: number;
  created_at: string;
}

export interface WeeklySummary {
  id: string;
  user_id: string;
  week_start: string;
  shown_at: string;
}
