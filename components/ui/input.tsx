import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink shadow-inner transition placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 dark:bg-elevated",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
