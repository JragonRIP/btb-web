"use client";

import { usePathname } from "next/navigation";

export function TabRouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="btb-tab-enter flex min-h-0 flex-1 flex-col" data-pathname={pathname}>
      {children}
    </div>
  );
}
