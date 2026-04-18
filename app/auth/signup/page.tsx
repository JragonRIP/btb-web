"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/hooks/use-supabase-browser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const supabase = useSupabaseBrowser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const origin = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
    } else if (data.session) {
      toast.success("Account created");
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.success("Check your email to confirm your account.");
    }
    setBusy(false);
  }

  if (!supabase) {
    return <Card className="w-full max-w-md p-6 shadow-gold">Loading…</Card>;
  }

  return (
    <Card className="w-full max-w-md p-6 shadow-gold">
      <h2 className="font-display text-xl font-semibold text-ink">Create your account</h2>
      <p className="mt-1 text-sm text-muted">Email and password. You can add magic-link sign-in anytime from login.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="su-email">Email</Label>
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-password">Password</Label>
          <Input
            id="su-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Sign up"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link className="font-medium text-gold hover:underline" href="/auth/login">
          Log in
        </Link>
      </p>
    </Card>
  );
}
