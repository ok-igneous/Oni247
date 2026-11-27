import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import LegacyAppClient from "../../src/LegacyAppClient";
import StorefrontHydrationBridge from "../../src/StorefrontHydrationBridge";
import {
  getNextStorefrontPage,
  isPublicStorefrontNotFound,
} from "../../server/nextStorefront";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ segments?: string[] }>;
};

async function getRequestUrl(params: PageProps["params"]): Promise<string> {
  const [{ segments }, requestHeaders] = await Promise.all([params, headers()]);
  const pathname = segments?.length
    ? `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`
    : "/";

  const host =
    requestHeaders.get("host") ||
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const configuredUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const fallback = new URL(configuredUrl);
  const protocolHeader = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = protocolHeader === "https" || protocolHeader === "http"
    ? protocolHeader
    : fallback.protocol.slice(0, -1);

  return new URL(pathname, `${protocol}://${host || fallback.host}`).toString();
}

async function loadPage(params: PageProps["params"]) {
  const requestUrl = await getRequestUrl(params);
  try {
    return await getNextStorefrontPage(requestUrl);
  } catch (error) {
    if (isPublicStorefrontNotFound(error)) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await loadPage(params);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.canonicalUrl },
    robots: { index: true, follow: true, maxImagePreview: "large" },
    openGraph: {
      type: "website",
      title: page.title,
      description: page.description,
      url: page.canonicalUrl,
      siteName: "Oni247",
      ...(page.image ? { images: [{ url: page.image }] } : {}),
    },
    twitter: {
      card: page.image ? "summary_large_image" : "summary",
      title: page.title,
      description: page.description,
      ...(page.image ? { images: [page.image] } : {}),
    },
  };
}

export default async function PublicRoutePage({ params }: PageProps) {
  const page = await loadPage(params);
  if (!page) return <LegacyAppClient />;

  const structuredData = page.jsonLd
    ? JSON.stringify(page.jsonLd).replace(/</g, "\\u003c")
    : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      )}
      <StorefrontHydrationBridge html={page.body} />
    </>
  );
}
