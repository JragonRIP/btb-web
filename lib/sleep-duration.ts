/**
 * Computes sleep duration in hours from bedtime / wake_time (HH:mm:ss or HH:mm).
 * If wake is earlier than bed on the clock, assumes wake is the next calendar day.
 */
export function computeSleepDurationHours(
  bedtime: string | null | undefined,
  wakeTime: string | null | undefined
): number | null {
  if (!bedtime || !wakeTime) return null;
  const bed = parseTimeToMinutes(bedtime);
  const wake = parseTimeToMinutes(wakeTime);
  if (bed === null || wake === null) return null;
  let minutes = wake - bed;
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 100) / 100;
}

function parseTimeToMinutes(t: string): number | null {
  const parts = t.trim().split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}
