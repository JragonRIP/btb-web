"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { readProfileCache } from "@/lib/btb-local-cache";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Redirects to /onboarding until profiles.onboarding_completed is true.
 * Only wraps authenticated main app routes (not /onboarding itself).
 * Onboarding status is fetched once per session (plus sync from localStorage cache),
 * not on every pathname change, so tab switches stay instant.
 */
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const onboardingDoneRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") onboardingDoneRef.current = null;
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
