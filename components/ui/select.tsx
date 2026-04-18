import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full appearance-none rounded-xl border border-line bg-surface px-3 pr-9 text-sm text-ink shadow-inner transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 dark:bg-elevated",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
