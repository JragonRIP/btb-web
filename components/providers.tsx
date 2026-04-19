"use client";

import { ThemeProvider } from "next-themes";
import { SonnerToaster } from "@/components/sonner-toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <SonnerToaster />
    </ThemeProvider>
  );
}
