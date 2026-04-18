import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backHref,
  right,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 px-4 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
        <div className="min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted transition hover:text-gold"
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
