"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { clearActiveUserId, readActiveUserId, readProfileCache, touchActiveUserId } from "@/lib/btb-local-cache";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Redirects to /onboarding until profiles.onboarding_completed is true.
 * Only wraps authenticated main app routes (not /onboarding itself).
 * Onboarding status is fetched once per session (plus sync from localStorage cache),
 * not on every pathname change, so tab switches stay instant.
 */
/** `true` / `false` from profile cache, or `null` if unknown — same as gate ref seed. */
function cachedOnboardingDone(): boolean | null {
  if (typeof window === "undefined") return null;
  const uid = readActiveUserId();
  if (!uid) return null;
  const c = readProfileCache(uid);
  if (!c?.v || typeof c.v.onboarding_completed !== "boolean") return null;
  return c.v.onboarding_completed;
}

export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const pathname = usePathname();
  const router = useRouter();
  const onboardingDoneRef = useRef<boolean | null>(cachedOnboardingDone());
  const [ready, setReady] = useState(() => cachedOnboardingDone() !== null);

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        onboardingDoneRef.current = null;
        clearActiveUserId();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (envError) {
      setReady(true);
      return;
    }
    if (!supabase) return;

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setReady(true);
        return;
      }

      touchActiveUserId(user.id);

      const fromCache = readProfileCache(user.id);
      if (fromCache?.v && typeof fromCache.v.onboarding_completed === "boolean") {
        onboardingDoneRef.current = fromCache.v.onboarding_completed;
      }

      if (onboardingDoneRef.current === null) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error(error);
          onboardingDoneRef.current = false;
        } else {
          onboardingDoneRef.current = profile?.onboarding_completed === true;
        }
      }

      const completed = onboardingDoneRef.current === true;
      if (!completed && pathname && !pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
        return;
      }

      if (completed && pathname === "/onboarding") {
        router.replace("/home");
        return;
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, envError, pathname, router]);

  if (envError) return <>{children}</>;

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
