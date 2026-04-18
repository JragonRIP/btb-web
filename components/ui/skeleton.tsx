import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-line/10 via-gold/10 to-line/10 dark:from-white/5 dark:via-gold/15 dark:to-white/5",
        className
      )}
    />
  );
}
