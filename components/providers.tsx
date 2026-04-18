"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast:
              "bg-surface border border-line text-ink shadow-soft dark:shadow-soft-dark font-sans",
          },
        }}
      />
    </ThemeProvider>
  );
}
