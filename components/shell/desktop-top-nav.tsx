"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, Moon, Settings2, Trophy, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/log", label: "Log", icon: UtensilsCrossed },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/prs", label: "PRs", icon: Trophy },
] as const;

export function DesktopTopNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 hidden border-b border-line/80 bg-canvas/85 pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)] backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 pb-3">
        <div className="flex flex-1 flex-wrap items-center justify-center gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                scroll={false}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "bg-gold/15 text-ink shadow-gold dark:text-white"
                    : "text-muted hover:bg-elevated/80 hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4 text-gold" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </div>
        <Link
          href="/settings"
          prefetch
          scroll={false}
          className={cn(
            "inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink shadow-soft transition hover:border-gold/40 hover:shadow-gold dark:bg-elevated dark:shadow-soft-dark",
            pathname.startsWith("/settings") && "border-gold/50 shadow-gold"
          )}
          aria-label="Settings"
        >
          <Settings2 className="h-5 w-5 text-gold" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}
