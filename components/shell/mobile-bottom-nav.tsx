"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, Moon, Trophy, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/log", label: "Log", icon: UtensilsCrossed },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/prs", label: "PRs", icon: Trophy },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:bg-surface/90 md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors",
                active ? "text-gold" : "text-muted hover:text-ink"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-all",
                  active
                    ? "border-gold/40 bg-gold/10 shadow-[0_0_20px_rgb(var(--gold-glow)/0.2)]"
                    : "border-transparent bg-transparent"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "animate-float")} strokeWidth={1.75} />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
