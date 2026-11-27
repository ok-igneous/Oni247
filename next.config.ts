import type { NextConfig } from "next";

const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:3001").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return [{ source: "/:path*", headers }];
  },
  async rewrites() {
    return [
      { source: "/sitemap.xml", destination: `${apiOrigin}/sitemap.xml` },
      { source: "/robots.txt", destination: `${apiOrigin}/robots.txt` },
    ];
  },
};

export default nextConfig;
