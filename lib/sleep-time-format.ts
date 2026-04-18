import { format, parse } from "date-fns";

/** DB / HTML time → `HH:mm` for `<input type="time" />` */
export function dbTimeToInput(t: string | null | undefined): string {
  if (!t) return "22:30";
  const parts = t.trim().split(":");
  const h = (parts[0] ?? "22").padStart(2, "0");
  const m = (parts[1] ?? "30").slice(0, 2).padStart(2, "0");
  return `${h}:${m}`;
}

/** DB time → `11:00 PM` */
export function dbTimeToDisplay(t: string | null | undefined): string {
  if (!t) return "—";
  const normalized = t.length === 5 ? `${t}:00` : t;
  try {
    const d = parse(normalized, "HH:mm:ss", new Date());
    return format(d, "h:mm a");
  } catch {
    return "—";
  }
}
