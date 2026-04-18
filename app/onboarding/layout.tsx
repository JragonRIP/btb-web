export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-canvas pt-[calc(env(safe-area-inset-top,0px)+12px)]">{children}</div>
  );
}
