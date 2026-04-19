"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

const safeTop =
  "max(calc(env(safe-area-inset-top, 0px) + 10px), 12px)";

/**
 * Sonner must read resolved light/dark from next-themes (not `system`)
 * so toast `theme` matches the rest of the app after hydration.
 */
export function SonnerToaster() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme: "light" | "dark" =
    !mounted || resolvedTheme === undefined
      ? "light"
      : resolvedTheme === "dark"
        ? "dark"
        : "light";

  return (
    <Toaster
      position="top-center"
      theme={theme}
      richColors
      closeButton
      offset={{ top: safeTop }}
      mobileOffset={{ top: safeTop }}
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}
