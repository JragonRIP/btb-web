import { DesktopTopNav } from "@/components/shell/desktop-top-nav";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <DesktopTopNav />
      <div className="flex flex-1 flex-col pb-24 md:pb-6">{children}</div>
      <MobileBottomNav />
    </div>
  );
}
