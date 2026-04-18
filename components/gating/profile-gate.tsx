"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Redirects to /onboarding until profiles.onboarding_completed is true.
 * Only wraps authenticated main app routes (not /onboarding itself).
 */
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { client: supabase, error: envError } = useSupabaseBrowser();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

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

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error(error);
        setReady(true);
        return;
      }

      const completed = profile?.onboarding_completed === true;
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
