import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The existing root-level pages/ directory belongs to the legacy Vite
  // file-router. Only files ending in .next.tsx are Next.js route modules
  // until the legacy router is retired.
  pageExtensions: ["next.tsx", "next.ts", "next.jsx", "next.js"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
