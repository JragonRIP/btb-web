import { format, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayType } from "@/types";

/**
 * Recomputes current_streak / best_streak on profiles.
 * A day counts toward the streak if: calorie + protein goals met, AND
 * (weekly plan is rest OR workout_logs.completed for that date).
 */
export async function recomputeStreaks(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: profile, error: pe } = await supabase
    .from("profiles")
    .select("calorie_goal, protein_goal_g, best_streak")
    .eq("id", userId)
    .maybeSingle();
  if (pe || !profile) return;

  const { data: plans } = await supabase.from("weekly_workout_plan").select("day_of_week, day_type").eq("user_id", userId);
  const typeByDow = new Map<number, DayType>();
  for (const row of plans ?? []) {
    typeByDow.set(row.day_of_week, row.day_type as DayType);
  }

  let streak = 0;
  const maxDays = 180;

  for (let i = 0; i < maxDays; i++) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dow = d.getDay();

    const { data: foods } = await supabase
      .from("food_logs")
      .select("calories, protein_g")
      .eq("user_id", userId)
      .eq("date", dateStr);
    const calories = (foods ?? []).reduce((a, r) => a + (r.calories ?? 0), 0);
    const protein = (foods ?? []).reduce((a, r) => a + Number(r.protein_g ?? 0), 0);
    const foodOk = calories >= profile.calorie_goal && protein >= profile.protein_goal_g;

    const dayType = typeByDow.get(dow) ?? "workout";
    let workoutOk = dayType === "full_rest" || dayType === "active_rest";
    if (!workoutOk) {
      const { data: log } = await supabase
        .from("workout_logs")
        .select("completed")
        .eq("user_id", userId)
        .eq("date", dateStr)
        .maybeSingle();
      workoutOk = log?.completed === true;
    }

    if (foodOk && workoutOk) streak++;
    else break;
  }

  const best = Math.max(Number(profile.best_streak ?? 0), streak);
  await supabase.from("profiles").update({ current_streak: streak, best_streak: best }).eq("id", userId);
}
