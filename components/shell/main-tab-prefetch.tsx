"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TAB_PATHS = ["/home", "/workout", "/log", "/sleep", "/prs"] as const;

/** Warm the client cache for primary tabs so switches feel instant. */
export function MainTabPrefetch() {
  const router = useRouter();
  useEffect(() => {
    TAB_PATHS.forEach((path) => {
      try {
        router.prefetch(path);
      } catch {
        /* noop */
      }
    });
  }, [router]);
  return null;
}
