import type { NextConfig } from "next";

const apiOrigin = (process.env.ONI247_API_INTERNAL_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
const renderHost = (process.env.RENDER_EXTERNAL_HOSTNAME ?? "oni247-staging.onrender.com").replace(/\./g, "\\.");
const customHostPattern = `^(?!www\\.oni247\\.org$)(?!oni247\\.org$)(?!${renderHost}$).+import type { NextConfig } from "next";

const apiOrigin = (process.env.ONI247_API_INTERNAL_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
const renderHost = (process.env.RENDER_EXTERNAL_HOSTNAME ?? "oni247-staging.onrender.com").replace(/\./g, "\\.");
;

const nextConfig: NextConfig = {
  pageExtensions: ["next.tsx", "next.ts", "next.jsx", "next.js"],
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/:path+", has: [{ type: "host", value: customHostPattern }], destination: `${apiOrigin}/:path+` },
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
