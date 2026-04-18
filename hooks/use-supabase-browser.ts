"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

export function useSupabaseBrowser(): SupabaseClient | null {
  const [client, setClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    setClient(createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey()));
  }, []);

  return client;
}
