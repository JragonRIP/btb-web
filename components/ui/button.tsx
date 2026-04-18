import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-gold text-zinc-950 shadow-gold hover:brightness-110 dark:text-white": variant === "primary",
            "border border-line bg-surface text-ink hover:bg-elevated": variant === "secondary",
            "text-muted hover:text-ink hover:bg-elevated/80": variant === "ghost",
            "bg-red-600/90 text-white hover:bg-red-600": variant === "danger",
            "h-9 px-3 text-sm": size === "sm",
            "h-11 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
