/**
 * Allows `next build` without Supabase env (e.g. CI) while real deploys must set vars.
 * Replace placeholders at runtime — requests will fail until valid keys are configured.
 */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDc1ODk2MDAsImV4cCI6MTk2MzE2NTYwMH0.invalid";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_ANON;
}
