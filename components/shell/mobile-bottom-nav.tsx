"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
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

function MobileBottomNavInner() {
  const pathname = usePathname();

  const links = useMemo(
    () =>
      items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            prefetch
            scroll={false}
            className={cn(
              "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium text-muted transition-colors hover:text-ink",
              active && "text-gold"
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors",
                active ? "border-gold/40 bg-gold/10" : "border-transparent bg-transparent"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="truncate">{label}</span>
          </Link>
        );
      }),
    [pathname]
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md dark:bg-canvas/95 md:hidden"
      style={{ transform: "translateZ(0)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">{links}</div>
    </nav>
  );
}

export const MobileBottomNav = memo(MobileBottomNavInner);
