import "server-only";
import superjson from "superjson";
import type { OutputType } from "../../../endpoints/storefront_GET.schema";
import type { OutputType as PublicGalleryOutput } from "../../../endpoints/galleries/public_GET.schema";
import type { OutputType as PublicEventOutput } from "../../../endpoints/events/public_GET.schema";
import type { OutputType as PublicEventsOutput } from "../../../endpoints/events/publicList_GET.schema";
import { isPlatformHostname, isUnsupportedPlatformSubdomain, normalizeDomainHost } from "../../../server/storefrontPrerender";

export type StorefrontHostResolution = { slug: string | null; customDomain: boolean; platformHost: boolean };
const apiOrigin = () => (process.env.ONI247_API_INTERNAL_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");
const configuredPlatformRoot = () => process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || "https://www.oni247.org";

export async function resolveStorefrontHost(hostHeader: string): Promise<StorefrontHostResolution> {
  const host = normalizeDomainHost(`https://${hostHeader}`);
  if (!host) return { slug: null, customDomain: false, platformHost: false };
  const root = configuredPlatformRoot();
  const renderHost = normalizeDomainHost(`https://${process.env.RENDER_EXTERNAL_HOSTNAME || "oni247-staging.onrender.com"}`);
  const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isUnsupportedPlatformSubdomain(host, root)) {
    return { slug: null, customDomain: false, platformHost: false };
  }
  if (isPlatformHostname(host, root) || localHost || (renderHost && host === renderHost)) return { slug: null, customDomain: false, platformHost: true };

  // Ask Fastify to resolve the host so the Next.js process does not open a second DB pool.
  // This endpoint returns only the slug of a published business mapped to a verified host.
  const url = new URL("/_api/storefrontHost", apiOrigin());
  url.searchParams.set("host", host);
  const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) return { slug: null, customDomain: false, platformHost: false };
  const result = await response.json() as { slug?: unknown };
  const slug = typeof result.slug === "string" && result.slug.length > 0 ? result.slug : null;
  return { slug, customDomain: Boolean(slug), platformHost: false };
}

export async function getStorefrontData(slug: string): Promise<OutputType | null> {
  const url = new URL("/_api/storefront", apiOrigin());
  url.searchParams.set("slug", slug);
  const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) return null;
  return superjson.parse<OutputType>(await response.text());
}

export function storefrontMetadata(data: OutputType, canonicalUrl: string) {
  const appearance = data.business.appearanceSettings ?? {};
  const title = typeof appearance.seoTitle === "string" && appearance.seoTitle.trim() ? appearance.seoTitle.trim() : `${data.business.name} — Products & Services`;
  const description = typeof appearance.seoDescription === "string" && appearance.seoDescription.trim() ? appearance.seoDescription.trim() : data.business.description ?? `Browse products and services from ${data.business.name}.`;
  const image = typeof appearance.shareImageUrl === "string" && appearance.shareImageUrl ? appearance.shareImageUrl : data.business.heroImageUrl || data.business.logoUrl || undefined;
  return {
    title, description, alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" as const } },
    openGraph: { type: "website" as const, title, description, siteName: data.business.name, url: canonicalUrl, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" as const : "summary" as const, title, description, ...(image ? { images: [image] } : {}) },
  };
}

export async function getPublicGalleryData(slug: string, gallerySlug: string): Promise<PublicGalleryOutput | null> {
  const url = new URL("/_api/galleries/public", apiOrigin());
  url.searchParams.set("slug", slug);
  url.searchParams.set("gallerySlug", gallerySlug);
  const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) return null;
  return superjson.parse<PublicGalleryOutput>(await response.text());
}

export async function getPublicEventData(slug: string, eventSlug: string): Promise<PublicEventOutput | null> {
  const url = new URL("/_api/events/public", apiOrigin());
  url.searchParams.set("slug", slug);
  url.searchParams.set("event", eventSlug);
  const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) return null;
  return superjson.parse<PublicEventOutput>(await response.text());
}

export async function getPublicEventsData(slug: string): Promise<PublicEventsOutput> {
  const url = new URL("/_api/events/publicList", apiOrigin());
  url.searchParams.set("slug", slug);
  const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) return { events: [] };
  return superjson.parse<PublicEventsOutput>(await response.text());
}
