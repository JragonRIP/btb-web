# Build The Body

A personal health Progressive Web App built with **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, and **Supabase** (Postgres + Auth). Track workouts, body measurements, and sleep with charts, a unified dashboard, and offline-capable installability.

Authentication uses Supabase with cookie-based sessions via [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs) (the supported replacement for the deprecated `@supabase/auth-helpers-nextjs` package).

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project

## Quick start

1. **Clone and install**

   ```bash
   git clone <your-repo-url> btb-web
   cd btb-web
   npm install
   ```

2. **Environment variables**

   Copy the example file and add your Supabase URL and anon key (Project Settings → API in the Supabase dashboard):

   ```bash
   cp .env.local.example .env.local
   ```

   Required keys:

   - `NEXT_PUBLIC_SUPABASE_URL` (must be `https://…`, no trailing slash required)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   **Production builds:** `NEXT_PUBLIC_*` values are embedded when you run `npm run build`, so CI and Vercel must define these variables before the build step (same as local `.env.local`).

   **Smoke test (optional):** with `.env.local` in place, run `node scripts/verify-supabase-auth.mjs` to confirm your machine can reach Supabase Auth.

   **If the browser shows `Load failed` on sign-up:** you were likely hitting the wrong API host (e.g. stale build without env vars, or placeholder URL). Fix env vars, restart `npm run dev`, or run a fresh `npm run build` after setting them. The app trims whitespace and optional quotes around values.

3. **Database schema**

   In the Supabase SQL editor, run the script in `supabase/schema.sql`. It creates `workouts`, `measurements`, and `sleep_logs` with **Row Level Security** so each user only sees their own rows.

4. **Auth URLs (magic link / email confirm)**

   In Supabase → Authentication → URL configuration, add your local and production URLs, for example:

   - Site URL: `http://localhost:3000` (dev) or your Vercel URL (prod)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://<your-domain>/auth/callback`

5. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The service worker from `next-pwa` is disabled in development; production builds enable offline caching for the app shell.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repo in [Vercel](https://vercel.com/) and set the same environment variables as in `.env.local`.
3. Deploy. No `vercel.json` is required for a standard Next.js deployment; optional headers or redirects can be added later if needed.

## PWA icons

Gold/dark placeholder icons are generated as `public/icon-192.png` and `public/icon-512.png`. Regenerate on Windows with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-pwa-icons.ps1
```

## Project structure

```
app/
  (main)/           # Authenticated shell (nav + trackers)
  auth/             # Login, signup, OAuth/magic-link callback
  manifest.ts       # Web app manifest
components/
lib/
  supabase/         # Supabase browser/server/middleware helpers
  supabaseClient.ts # Re-export of browser client
types/
supabase/schema.sql
.env.local.example
```

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm run dev` | Start dev server   |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint`  | ESLint             |

## License

Private / your terms.
