import type { FoodLog, PersonalRecord, Profile, SleepLog, WeeklyWorkoutPlanRow, WeightLog } from "@/types";

export const BTB_PROFILE_TTL_MS = 60 * 60 * 1000;

const NS = "btb";
const ACTIVE_UID_KEY = `${NS}_active_uid`;

export function touchActiveUserId(userId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_UID_KEY, userId);
  } catch {
    /* ignore quota */
  }
}

export function readActiveUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_UID_KEY);
  } catch {
    return null;
  }
}

export function clearActiveUserId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_UID_KEY);
  } catch {
    /* ignore */
  }
}

export function profileCacheKey(userId: string) {
  return `${NS}_profile_${userId}`;
}

export function foodTodayCacheKey(userId: string, date: string) {
  return `${NS}_today_food_${userId}_${date}`;
}

export function lastSleepCacheKey(userId: string) {
  return `${NS}_last_sleep_${userId}`;
}

export function weekHomeCacheKey(userId: string, weekStart: string) {
  return `${NS}_week_home_${userId}_${weekStart}`;
}

export function weeklyPlanCacheKey(userId: string) {
  return `${NS}_weekly_plan_${userId}`;
}

export function sleepListCacheKey(userId: string) {
  return `${NS}_sleep_list_${userId}`;
}

export type CachedEnvelope<T> = { v: T; ts: number };

function safeParse<T>(raw: string | null): CachedEnvelope<T> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedEnvelope<T>;
  } catch {
    return null;
  }
}

export function readProfileCache(userId: string): CachedEnvelope<Profile> | null {
  if (typeof window === "undefined") return null;
  return safeParse<Profile>(localStorage.getItem(profileCacheKey(userId)));
}

export function writeProfileCache(userId: string, profile: Profile) {
  if (typeof window === "undefined") return;
  touchActiveUserId(userId);
  const env: CachedEnvelope<Profile> = { v: profile, ts: Date.now() };
  localStorage.setItem(profileCacheKey(userId), JSON.stringify(env));
}

export function profileCacheIsFresh(ts: number) {
  return Date.now() - ts < BTB_PROFILE_TTL_MS;
}

export function readFoodTodayCache(userId: string, date: string): CachedEnvelope<FoodLog[]> | null {
  if (typeof window === "undefined") return null;
  return safeParse<FoodLog[]>(localStorage.getItem(foodTodayCacheKey(userId, date)));
}

export function writeFoodTodayCache(userId: string, date: string, rows: FoodLog[]) {
  if (typeof window === "undefined") return;
  touchActiveUserId(userId);
  localStorage.setItem(foodTodayCacheKey(userId, date), JSON.stringify({ v: rows, ts: Date.now() } satisfies CachedEnvelope<FoodLog[]>));
}

export function readLastSleepCache(userId: string): CachedEnvelope<SleepLog | null> | null {
  if (typeof window === "undefined") return null;
  return safeParse<SleepLog | null>(localStorage.getItem(lastSleepCacheKey(userId)));
}

export function writeLastSleepCache(userId: string, log: SleepLog | null) {
  if (typeof window === "undefined") return;
  touchActiveUserId(userId);
  localStorage.setItem(lastSleepCacheKey(userId), JSON.stringify({ v: log, ts: Date.now() } satisfies CachedEnvelope<SleepLog | null>));
}

export type WeekHomePayload = {
  food: FoodLog[];
  workouts: { date: string; completed: boolean }[];
};

export function readWeekHomeCache(userId: string, weekStart: string): CachedEnvelope<WeekHomePayload> | null {
  if (typeof window === "undefined") return null;
  return safeParse<WeekHomePayload>(localStorage.getItem(weekHomeCacheKey(userId, weekStart)));
}

export function writeWeekHomeCache(userId: string, weekStart: string, payload: WeekHomePayload) {
  if (typeof window === "undefined") return;
  touchActiveUserId(userId);
  localStorage.setItem(weekHomeCacheKey(userId, weekStart), JSON.stringify({ v: payload, ts: Date.now() }));
}

export function readWeeklyPlanCache(userId: string): CachedEnvelope<WeeklyWorkoutPlanRow[]> | null {
  if (typeof window === "undefined") return null;
  return safeParse<WeeklyWorkoutPlanRow[]>(localStorage.getItem(weeklyPlanCacheKey(userId)));
}

export function writeWeeklyPlanCache(userId: string, rows: WeeklyWorkoutPlanRow[]) {
  if (typeof window === "undefined") return;
  touchActiveUserId(userId);
  localStorage.setItem(weeklyPlanCacheKey(userId), JSON.stringify({ v: rows, ts: Date.now() }));
}

export function readSleepListCache(userId: string): CachedEnvelope<SleepLog[]> | null {
  if (typeof window === "undefined") return null;
  return safeParse<SleepLog[]>(localStorage.getItem(sleepListCacheKey(userId)));
}

export function writeSleepListCache(userId: string, rows: SleepLog[]) {
  if (typeof window === "undefined") return;
  touchActiveUserId(userId);
  localStorage.setItem(sleepListCacheKey(userId), JSON.stringify({ v: rows, ts: Date.now() }));
}

export function prsListCacheKey(userId: string) {
  return `${NS}_prs_${userId}`;
}

export function weightLogsCacheKey(userId: string) {
  return `${NS}_weights_${userId}`;
}

export function readPrsCache(userId: string): CachedEnvelope<PersonalRecord[]> | null {
  if (typeof window === "undefined") return null;
  return safeParse<PersonalRecord[]>(localStorage.getItem(prsListCacheKey(userId)));
}

export function writePrsCache(userId: string, rows: PersonalRecord[]) {
  if (typeof window === "undefined") return;
  touchActiveUserId(userId);
  localStorage.setItem(prsListCacheKey(userId), JSON.stringify({ v: rows, ts: Date.now() } satisfies CachedEnvelope<PersonalRecord[]>));
}

export function readWeightLogsCache(userId: string): CachedEnvelope<WeightLog[]> | null {
  if (typeof window === "undefined") return null;
  return safeParse<WeightLog[]>(localStorage.getItem(weightLogsCacheKey(userId)));
}

export function writeWeightLogsCache(userId: string, rows: WeightLog[]) {
  if (typeof window === "undefined") return;
  touchActiveUserId(userId);
  localStorage.setItem(weightLogsCacheKey(userId), JSON.stringify({ v: rows, ts: Date.now() } satisfies CachedEnvelope<WeightLog[]>));
}
