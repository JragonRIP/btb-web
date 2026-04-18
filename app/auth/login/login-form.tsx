"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginFormInner() {
  const supabase = useSupabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const error = searchParams.get("error");
  const errMsg = error === "auth" ? "That sign-in link was invalid or expired." : null;

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) {
      toast.error(signError.message);
    } else {
      toast.success("Signed in");
      router.push(next);
      router.refresh();
    }
    setBusy(false);
  }

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const origin = window.location.origin;
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (magicError) toast.error(magicError.message);
    else toast.success("Check your email for the magic link.");
    setBusy(false);
  }

  if (!supabase) {
    return <Card className="w-full max-w-md p-6 shadow-gold">Loading…</Card>;
  }

  return (
    <Card className="w-full max-w-md p-6 shadow-gold">
      {errMsg && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
          {errMsg}
        </p>
      )}
      <form className="space-y-4" onSubmit={onPasswordLogin}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy || !password}>
          {busy ? "Please wait…" : "Log in with password"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line/30" />
        <span className="text-xs uppercase tracking-wide text-muted">or</span>
        <div className="h-px flex-1 bg-line/30" />
      </div>

      <form onSubmit={onMagicLink} className="space-y-3">
        <p className="text-xs text-muted">Magic link uses the same email — no password required.</p>
        <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
          Email me a magic link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link className="font-medium text-gold hover:underline" href="/auth/signup">
          Create an account
        </Link>
      </p>
    </Card>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<Card className="w-full max-w-md p-6">Loading…</Card>}>
      <LoginFormInner />
    </Suspense>
  );
}
