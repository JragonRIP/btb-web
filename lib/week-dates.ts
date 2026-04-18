import { addDays, startOfWeek, subWeeks } from "date-fns";

/** DB: 0=Sun … 6=Sat. Returns calendar date for that weekday in the week containing `anchor` (Monday-based week). */
export function dateForDbDayOfWeek(anchor: Date, dbDow: number, weekOffset = 0): Date {
  const monday = subWeeks(startOfWeek(anchor, { weekStartsOn: 1 }), weekOffset);
  const offsetFromMonday = dbDow === 0 ? 6 : dbDow - 1;
  return addDays(monday, offsetFromMonday);
}

/** Mon-first display order → DB day_of_week */
export const MON_FIRST_DB_DOW = [1, 2, 3, 4, 5, 6, 0] as const;
