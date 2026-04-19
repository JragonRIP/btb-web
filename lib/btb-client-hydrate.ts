import { format, startOfWeek, subWeeks } from "date-fns";
import type { FoodLog, PersonalRecord, Profile, SleepLog, WeeklyWorkoutPlanRow, WeightLog } from "@/types";
import {
  readActiveUserId,
  readFoodTodayCache,
  readLastSleepCache,
  readPrsCache,
  readProfileCache,
  readSleepListCache,
  readWeekHomeCache,
  readWeeklyPlanCache,
  readWeightLogsCache,
} from "@/lib/btb-local-cache";

/** Home dashboard: any of profile, today food, last sleep envelope, or week strip cache. */
export function readHomeBootstrap(weekOffset: number): {
  profile: Profile | null;
  foodToday: FoodLog[];
  lastSleep: SleepLog | null;
  weekFood: FoodLog[];
  weekWorkouts: { date: string; completed: boolean }[];
} | null {
  if (typeof window === "undefined") return null;
  const uid = readActiveUserId();
  if (!uid) return null;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const anchor = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const wkStart = format(anchor, "yyyy-MM-dd");
  const pCached = readProfileCache(uid);
  const fCached = readFoodTodayCache(uid, todayStr);
  const sCached = readLastSleepCache(uid);
  const wCached = readWeekHomeCache(uid, wkStart);
  const hasAny = Boolean(pCached || fCached != null || sCached != null || wCached);
  if (!hasAny) return null;
  return {
    profile: pCached?.v ?? null,
    foodToday: fCached?.v ?? [],
    lastSleep: sCached ? sCached.v : null,
    weekFood: wCached?.v?.food ?? [],
    weekWorkouts: wCached?.v?.workouts ?? [],
  };
}

export function readLogBootstrap(): { profile: Profile | null; rows: FoodLog[] } | null {
  if (typeof window === "undefined") return null;
  const uid = readActiveUserId();
  if (!uid) return null;
  const today = format(new Date(), "yyyy-MM-dd");
  const pCached = readProfileCache(uid);
  const fCached = readFoodTodayCache(uid, today);
  const hasAny = Boolean(pCached || fCached != null);
  if (!hasAny) return null;
  return {
    profile: pCached?.v ?? null,
    rows: fCached?.v ?? [],
  };
}

export function readSleepBootstrap(): { profile: Profile | null; rows: SleepLog[] } | null {
  if (typeof window === "undefined") return null;
  const uid = readActiveUserId();
  if (!uid) return null;
  const pCached = readProfileCache(uid);
  const sCached = readSleepListCache(uid);
  const hasAny = Boolean(pCached || sCached != null);
  if (!hasAny) return null;
  return {
    profile: pCached?.v ?? null,
    rows: sCached?.v ?? [],
  };
}

export function readWeeklyPlanBootstrap(): WeeklyWorkoutPlanRow[] | null {
  if (typeof window === "undefined") return null;
  const uid = readActiveUserId();
  if (!uid) return null;
  const c = readWeeklyPlanCache(uid);
  if (c == null) return null;
  return c.v;
}

export function readPrsBootstrap(): { prs: PersonalRecord[]; weights: WeightLog[] } | null {
  if (typeof window === "undefined") return null;
  const uid = readActiveUserId();
  if (!uid) return null;
  const p = readPrsCache(uid);
  const w = readWeightLogsCache(uid);
  const hasAny = p != null || w != null;
  if (!hasAny) return null;
  return {
    prs: p?.v ?? [],
    weights: w?.v ?? [],
  };
}
