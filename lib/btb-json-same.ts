/** Stable JSON equality for cache vs remote comparisons (key order from same API is stable enough). */
export function jsonSame(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
