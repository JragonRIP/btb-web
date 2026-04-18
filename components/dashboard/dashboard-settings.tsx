"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Moon, Settings2, Sun, Monitor } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardSettings() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink shadow-soft transition hover:border-gold/40 hover:shadow-gold dark:bg-elevated dark:shadow-soft-dark",
          open && "border-gold/50 shadow-gold"
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Settings"
      >
        <Settings2 className="h-5 w-5 text-gold" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl border border-line bg-surface p-3 shadow-soft dark:bg-elevated dark:shadow-soft-dark">
          <p className="px-1 pb-2 font-display text-sm font-semibold text-ink">Settings</p>
          <p className="px-1 pb-3 text-xs text-muted">Appearance</p>
          <div className="grid grid-cols-3 gap-2 pb-4">
            <ThemeChip
              active={mounted && theme === "light"}
              icon={Sun}
              label="Light"
              onClick={() => setTheme("light")}
            />
            <ThemeChip
              active={mounted && theme === "dark"}
              icon={Moon}
              label="Dark"
              onClick={() => setTheme("dark")}
            />
            <ThemeChip
              active={mounted && theme === "system"}
              icon={Monitor}
              label="System"
              onClick={() => setTheme("system")}
            />
          </div>
          <Button variant="secondary" className="w-full justify-center gap-2" type="button" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}

function ThemeChip({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Sun;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-medium transition",
        active
          ? "border-gold/50 bg-gold/10 text-ink dark:text-white"
          : "border-line bg-surface text-muted hover:text-ink dark:bg-surface/40"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
