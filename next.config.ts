import type { NextConfig } from "next";

const apiOrigin = (process.env.ONI247_API_INTERNAL_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
const renderHost = (process.env.RENDER_EXTERNAL_HOSTNAME ?? "oni247-staging.onrender.com").replace(/\./g, "\\.");
const customHostPattern = `^(?!www\\.oni247\\.org$)(?!oni247\\.org$)(?!localhost(?::\\d+)?$)(?!127\\.0\\.0\\.1(?::\\d+)?$)(?!${renderHost}$).+$`;
const legacyStorefrontSections = "(p|e|g|products|services|about|gallery|blog|events|contact|track|checkout|book|booking|f)";

const nextConfig: NextConfig = {
  pageExtensions: ["next.tsx", "next.ts", "next.jsx", "next.js"],
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return {
      // Do not rewrite /_next assets: only known legacy storefront paths on custom hosts.
      beforeFiles: [
        { source: `/:section${legacyStorefrontSections}`, has: [{ type: "host", value: customHostPattern }], destination: `${apiOrigin}/:section` },
        { source: `/:section${legacyStorefrontSections}/:path*`, has: [{ type: "host", value: customHostPattern }], destination: `${apiOrigin}/:section/:path*` },
      ],
      afterFiles: [
        { source: "/_api/:path*", destination: `${apiOrigin}/_api/:path*` },
        { source: "/sitemap.xml", destination: `${apiOrigin}/sitemap.xml` },
        { source: "/robots.txt", destination: `${apiOrigin}/robots.txt` },
      ],
      fallback: [{ source: "/:path*", destination: `${apiOrigin}/:path*` }],
    };
  },
};

export default nextConfig;
