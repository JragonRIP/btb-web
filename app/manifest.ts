import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Build The Body",
    short_name: "Build The Body",
    description: "Personal health tracker for workouts, measurements, and sleep.",
    start_url: "/home",
    display: "standalone",
    background_color: "#faf6ed",
    theme_color: "#b8860b",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
