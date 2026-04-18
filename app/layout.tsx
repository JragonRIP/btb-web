import type { Metadata, Viewport } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Build The Body",
    template: "%s · Build The Body",
  },
  description: "Personal health tracker for workouts, body measurements, and sleep.",
  applicationName: "Build The Body",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Build The Body",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
