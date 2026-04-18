import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Safe area (min 16px) + 8px so titles / icons clear notch / status bar */
const safeTop = "pt-[calc(max(env(safe-area-inset-top,0px),16px)+8px)]";

export function PageHeader({
  title,
  subtitle,
  backHref,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-line/80 bg-canvas/80 px-4 pb-4 backdrop-blur-md",
        safeTop,
        className
      )}
    >
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
        <div className="min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="mb-2 inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-xs font-medium text-muted transition hover:text-gold"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0 pt-1">{right}</div>}
      </div>
    </header>
  );
}
