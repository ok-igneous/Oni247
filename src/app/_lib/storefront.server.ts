import "server-only";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../../helpers/db";
import { handle as storefrontEndpoint } from "../../../endpoints/storefront_GET";
import type { OutputType } from "../../../endpoints/storefront_GET.schema";
import { isPlatformHostname, normalizeDomainHost, resolvePlatformSubdomainSlug } from "../../../server/storefrontPrerender";

export type StorefrontHostResolution = { slug: string | null; customDomain: boolean; platformHost: boolean };
const configuredPlatformRoot = () => process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || "https://www.oni247.org";

export async function resolveStorefrontHost(hostHeader: string): Promise<StorefrontHostResolution> {
  const host = normalizeDomainHost(`https://${hostHeader}`);
  if (!host) return { slug: null, customDomain: false, platformHost: false };
  const root = configuredPlatformRoot();
  const renderHost = process.env.RENDER_EXTERNAL_HOSTNAME ? normalizeDomainHost(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`) : null;
  if (isPlatformHostname(host, root) || (renderHost && host === renderHost)) return { slug: null, customDomain: false, platformHost: true };
  const subdomainSlug = resolvePlatformSubdomainSlug(host, root);
  if (subdomainSlug) {
    const business = await db.selectFrom("businesses").select("slug").where("slug", "=", subdomainSlug).where("status", "=", "published").limit(1).executeTakeFirst();
    return { slug: business?.slug ?? null, customDomain: true, platformHost: false };
  }
  const normalizedStoredHost = sql<string | null>`case
    when lower("custom_domain") like 'http://%' then null
    else lower(split_part(split_part(regexp_replace("custom_domain", '^https?://', '', 'i'), '/', 1), ':', 1))
  end`;
  const business = await db.selectFrom("businesses").select("slug").where("status", "=", "published").where("customDomainStatus", "=", "verified").where(normalizedStoredHost, "=", host).limit(1).executeTakeFirst();
  return { slug: business?.slug ?? null, customDomain: Boolean(business), platformHost: false };
}

export async function getStorefrontData(slug: string): Promise<OutputType | null> {
  const request = new Request(`http://oni247.internal/_api/storefront?slug=${encodeURIComponent(slug)}`);
  const response = await storefrontEndpoint(request);
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
