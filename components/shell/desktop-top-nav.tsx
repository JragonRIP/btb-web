"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, LayoutDashboard, Moon, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/measurements", label: "Measurements", icon: Ruler },
  { href: "/sleep", label: "Sleep", icon: Moon },
] as const;

export function DesktopTopNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 hidden border-b border-line/80 bg-canvas/85 backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-1 px-4 py-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
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
    </div>
  );
}
