import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  glow,
  ...props
}: HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface/90 p-4 shadow-soft backdrop-blur-sm dark:bg-surface/70 dark:shadow-soft-dark",
        glow && "shadow-gold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("font-display text-lg font-semibold tracking-tight text-ink", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted", className)}>{children}</p>;
}
