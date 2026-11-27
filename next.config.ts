import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The existing root pages/ directory is legacy React Router code, not the
  // The root pages/ directory is legacy React Router source. Native App Router files use the explicit .next.tsx suffix.
  pageExtensions: ["next.tsx", "next.ts", "next.jsx", "next.js"],
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return {
      // Next.js owns public pages and API proxy handlers. Only unmatched
      // legacy dashboard/editor routes are internally rewritten to the
      // compatibility boundary; they are never sent to a Vite/Fastify SPA.
      fallback: [{ source: "/:path*", destination: "/legacy/:path*" }],
    };
  },
};

export default nextConfig;
