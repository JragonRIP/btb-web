/**
 * Supabase public config from Next.js env.
 * - No placeholder fallbacks (wrong host caused opaque "Load failed" fetches).
 * - Trims whitespace and optional surrounding quotes (common .env mistakes).
 * - Strips trailing slashes on the project URL.
 */
function readPublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    throw new Error(
      `${name} is missing. Add it to .env.local (local) or your host’s environment (e.g. Vercel), then restart the dev server or rebuild.`
    );
  }
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  if (!v) {
    throw new Error(`${name} is set but empty after trimming.`);
  }
  return v;
}

export function getSupabaseUrl(): string {
  const url = readPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!/^https:\/\//i.test(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be an https URL (e.g. https://xxxx.supabase.co)."
    );
  }
  return url.replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  return readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
