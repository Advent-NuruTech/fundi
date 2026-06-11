import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    // Served for navigations to pages that were never cached while online
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // Every same-origin page navigation: serve fresh when online, cached
        // copy when offline (Workbox matches the full URL, so this must be a
        // function matcher rather than a path-anchored regex).
        urlPattern: ({ request, url, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
          sameOrigin &&
          request.mode === "navigate" &&
          !url.pathname.startsWith("/ffmanage") &&
          !url.pathname.startsWith("/api"),
        handler: "NetworkFirst",
        options: {
          cacheName: "app-pages",
          expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
          sameOrigin && url.pathname.startsWith("/_next/data/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "next-data",
          expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:js|css|woff2?)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "build-assets",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-images",
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        // Next.js image optimizer responses
        urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
          sameOrigin && url.pathname.startsWith("/_next/image"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-images",
          expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        // Cloudinary-hosted user images (order photos, avatars, fabrics)
        urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "cloudinary-images",
          expiration: { maxEntries: 200, maxAgeSeconds: 14 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

const ADMIN_SECURITY_HEADERS = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig: NextConfig = {
  turbopack: {},   // ← this silences the webpack config conflict
  async headers() {
    return [
      {
        source: "/ffmanage/:path*",
        headers: ADMIN_SECURITY_HEADERS,
      },
      {
        source: "/api/ffmanage/:path*",
        headers: ADMIN_SECURITY_HEADERS,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withPWA(nextConfig);