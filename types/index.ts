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
