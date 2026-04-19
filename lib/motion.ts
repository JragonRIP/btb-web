/** Client-only; returns false during SSR. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
