import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Static export — generates pure HTML/CSS/JS, no Node server needed
  output: "export",

  // Disable image optimization (not compatible with static export)
  images: {
    unoptimized: true,
  },

  // Trailing slash for clean URLs on static hosts
  trailingSlash: true,
};

export default nextConfig;
