import { AppShell } from "@/components/shell/app-shell";
import { ProfileGate } from "@/components/gating/profile-gate";
import { TabRouteTransition } from "@/components/shell/tab-route-transition";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <ProfileGate>
        <TabRouteTransition>{children}</TabRouteTransition>
      </ProfileGate>
    </AppShell>
  );
}
