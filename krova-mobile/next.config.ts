import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Service worker + manifest are static — Next serves /public as-is.
  // No special config needed for PWA at the Next.js level.
};

export default nextConfig;
