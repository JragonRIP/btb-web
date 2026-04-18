import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[96px] w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-inner transition placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 dark:bg-elevated",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
