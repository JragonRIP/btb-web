"use client";

import Link from "next/link";
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const rowRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, height: 0, top: 0, ready: false });

  const activeIndex = useMemo(() => {
    return items.findIndex(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  }, [pathname]);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const link = linkRefs.current[activeIndex];
    if (!row || !link) return;
    const target = link.querySelector<HTMLElement>("[data-nav-pill-target]");
    if (!target) return;
    const rr = row.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    setPill({
      left: tr.left - rr.left,
      width: tr.width,
      height: tr.height,
      top: tr.top - rr.top,
      ready: true,
    });
  }, [activeIndex, pathname]);

  const links = useMemo(
    () =>
      items.map(({ href, label, icon: Icon }, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={href}
            ref={(el) => {
              linkRefs.current[i] = el;
            }}
            href={href}
            prefetch
            scroll={false}
            className={cn(
              "relative z-10 flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium text-muted transition-colors hover:text-ink",
              active && "text-gold"
            )}
          >
            <span
              data-nav-pill-target
              className={cn(
                "flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors",
                active ? "border-transparent bg-transparent" : "border-transparent bg-transparent"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="truncate">{label}</span>
          </Link>
        );
      }),
    [activeIndex]
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md dark:bg-canvas/95 md:hidden"
      style={{ transform: "translateZ(0)" }}
      aria-label="Primary"
    >
      <div ref={rowRef} className="relative mx-auto flex max-w-lg items-stretch justify-between px-1">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute rounded-xl border border-gold/40 bg-gold/10 transition-[left,top,width,height] duration-300 ease-out motion-reduce:transition-none",
            !pill.ready && "opacity-0"
          )}
          style={{
            left: pill.left,
            top: pill.top,
            width: pill.width,
            height: pill.height,
          }}
        />
        {links}
      </div>
    </nav>
  );
}

export const MobileBottomNav = memo(MobileBottomNavInner);
