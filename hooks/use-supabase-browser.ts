"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

/**
 * Browser Supabase client after mount (client-only).
 * `error` is set if env vars are missing/invalid — avoids silent wrong-host "Load failed" fetches.
 */
export function useSupabaseBrowser(): {
  client: SupabaseClient | null;
  error: string | null;
} {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setClient(createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey()));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not initialize Supabase.";
      console.error("[Supabase]", message);
      setError(message);
    }
  }, []);

  return { client, error };
}
