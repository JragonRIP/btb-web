/**
 * Supabase public config.
 * - Prefer `NEXT_PUBLIC_SUPABASE_*` from the environment (Vercel, .env.local).
 * - **Temporary:** hardcoded fallbacks so the app works if host env is not applied to the build.
 * - Trims whitespace and optional surrounding quotes (common .env mistakes).
 * - Strips trailing slashes on the project URL.
 */

/** @deprecated Remove fallbacks once Vercel env vars are confirmed on Production + Preview builds. */
const FALLBACK_SUPABASE_URL = "https://mgigodwyyivmehinklfg.supabase.co";

/** @deprecated Remove fallbacks once Vercel env vars are confirmed on Production + Preview builds. */
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naWdvZHd5eWl2bWVoaW5rbGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDQ0OTgsImV4cCI6MjA5MjEyMDQ5OH0.q_7qHvfo7x2diWGMuVVmwwWnsRq-n4cd-REczHPgreY";

function readOptionalPublicEnv(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== "string") return undefined;
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

export function getSupabaseUrl(): string {
  const fromEnv = readOptionalPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const url = (fromEnv ?? FALLBACK_SUPABASE_URL).replace(/\/+$/, "");
  if (!/^https:\/\//i.test(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be an https URL (e.g. https://xxxx.supabase.co)."
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  return readOptionalPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? FALLBACK_SUPABASE_ANON_KEY;
}
