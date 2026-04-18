/* eslint-disable @typescript-eslint/no-require-imports */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      urlPattern: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/_next/static"),
      handler: "CacheFirst",
      options: { cacheName: "next-static" },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
