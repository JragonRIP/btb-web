export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Build The Body</p>
        <p className="mt-2 text-sm text-muted">Train deliberately. Recover intentionally.</p>
      </div>
      {children}
    </div>
  );
}
