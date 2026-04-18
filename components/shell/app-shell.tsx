import { DesktopTopNav } from "@/components/shell/desktop-top-nav";
import { MainTabPrefetch } from "@/components/shell/main-tab-prefetch";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DesktopTopNav />
      <main className="relative flex min-h-0 flex-1 flex-col pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        {children}
      </main>
      <MainTabPrefetch />
      <MobileBottomNav />
    </div>
  );
}
