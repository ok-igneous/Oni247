import type { NextConfig } from "next";

const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:3001").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/_api/:path*", destination: `${apiOrigin}/_api/:path*` },
      { source: "/sitemap.xml", destination: `${apiOrigin}/sitemap.xml` },
      { source: "/robots.txt", destination: `${apiOrigin}/robots.txt` },
    ];
  },
};

export default nextConfig;
