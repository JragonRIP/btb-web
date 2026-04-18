/**
 * Smoke-test Auth REST from .env.local (no extra deps).
 * Usage: node scripts/verify-supabase-auth.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!base || !anon) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local");
  process.exit(1);
}

// Supabase rejects some reserved/test domains (e.g. example.com) even when the network is fine.
const email = `btb.smoke.${Date.now()}@gmail.com`;
const res = await fetch(`${base}/auth/v1/signup`, {
  method: "POST",
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password: "VerifySignup123!",
  }),
});

const text = await res.text();
console.log("POST /auth/v1/signup →", res.status);
console.log(text.slice(0, 500));
if (res.ok) {
  console.log("OK: Supabase Auth reachable from this machine.");
  process.exit(0);
}
process.exit(1);
