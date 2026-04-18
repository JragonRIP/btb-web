import { AppShell } from "@/components/shell/app-shell";
import { ProfileGate } from "@/components/gating/profile-gate";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <ProfileGate>{children}</ProfileGate>
    </AppShell>
  );
}
