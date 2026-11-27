import { cache } from "react";
import { sql } from "kysely";
import superjson from "superjson";
import { createCrawlerSnapshotLoader } from "./crawlerSnapshotLoader";
import {
  isPlatformHostname,
  isPublicCustomDomainPath,
  isPublicStorefrontPath,
  normalizeDomainHost,
  resolvePlatformSubdomainSlug,
} from "./storefrontPrerender";

export type NextStorefrontPage = {
  slug: string;
  customDomain: boolean;
  canonicalUrl: string;
  title: string;
  description: string;
  image?: string;
  body: string;
  jsonLd?: unknown;
};

export class PublicStorefrontNotFoundError extends Error {
  constructor() {
    super("Public storefront content not found");
    this.name = "PublicStorefrontNotFoundError";
  }
}

const PRIVATE_CUSTOM_DOMAIN_ROOTS = new Set([
  "checkout",
  "track",
  "book",
  "booking",
  "s",
  "f",
]);

const isLocalHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1";

const loadStorefrontPage = cache(async (requestUrl: string): Promise<NextStorefrontPage | null> => {
  const url = new URL(requestUrl);
  const hostname = url.hostname.toLowerCase();
  const configuredRoot = process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || null;
  const normalizedRoot = normalizeDomainHost(configuredRoot);
  const platformSubdomainSlug = resolvePlatformSubdomainSlug(hostname, configuredRoot);
  const platformHost =
    isLocalHost(hostname) ||
    !normalizedRoot ||
    isPlatformHostname(hostname, configuredRoot);

  let slug: string | null = null;
  let customDomain = false;

  if (platformSubdomainSlug) {
    const { db } = await import("../helpers/db");
    const business = await db
      .selectFrom("businesses")
      .select("slug")
      .where("slug", "=", platformSubdomainSlug)
      .where("status", "=", "published")
      .limit(1)
      .executeTakeFirst();

    slug = business?.slug ?? null;
    customDomain = true;
    if (!slug) throw new PublicStorefrontNotFoundError();
  } else if (platformHost) {
    if (!isPublicStorefrontPath(url.pathname)) return null;
    slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] ?? "");
  } else {
    const requestHost = normalizeDomainHost(`https://${hostname}`);
    if (!requestHost) throw new PublicStorefrontNotFoundError();

    const { db } = await import("../helpers/db");
    const normalizedStoredHost = sql<string | null>`case
      when lower("custom_domain") like 'http://%' then null
      else lower(split_part(split_part(regexp_replace("custom_domain", '^https?://', '', 'i'), '/', 1), ':', 1))
    end`;
    const business = await db
      .selectFrom("businesses")
      .select("slug")
      .where("status", "=", "published")
      .where("customDomainStatus", "=", "verified")
      .where(normalizedStoredHost, "=", requestHost)
      .limit(1)
      .executeTakeFirst();

    slug = business?.slug ?? null;
    customDomain = true;
    if (!slug) throw new PublicStorefrontNotFoundError();

    if (!isPublicCustomDomainPath(url.pathname)) {
      const firstSegment = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
      if (firstSegment && PRIVATE_CUSTOM_DOMAIN_ROOTS.has(firstSegment)) return null;
      throw new PublicStorefrontNotFoundError();
    }
  }

  if (!slug) return null;

  if (customDomain && !isPublicCustomDomainPath(url.pathname)) {
    const firstSegment = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    if (firstSegment && PRIVATE_CUSTOM_DOMAIN_ROOTS.has(firstSegment)) return null;
    throw new PublicStorefrontNotFoundError();
  }

  if (!customDomain && !isPublicStorefrontPath(url.pathname)) return null;

  const [
    { handle: storefrontEndpoint },
    { handle: galleryListEndpoint },
    { handle: galleryEndpoint },
  ] = await Promise.all([
    import("../endpoints/storefront_GET"),
    import("../endpoints/galleries/publicList_GET"),
    import("../endpoints/galleries/public_GET"),
  ]);

  type PublicBusinessMetadata = { name?: string; appearanceSettings?: Record<string, unknown> };
  const captured = { business: null as PublicBusinessMetadata | null };
  const storefrontWithMetadata = async (request: Request) => {
    const response = await storefrontEndpoint(request);
    if (!response.ok) return response;

    const body = await response.text();
    const parsed = superjson.parse<{ business?: PublicBusinessMetadata }>(body);
    captured.business = parsed.business ?? null;

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };

  const loader = createCrawlerSnapshotLoader({
    storefront: storefrontWithMetadata,
    galleryList: galleryListEndpoint,
    gallery: galleryEndpoint,
  });

  const snapshot = await loader({
    slug,
    pathname: url.pathname,
    origin: url.origin,
    customDomain,
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if ([
      "Public storefront not found",
      "Public product not found",
      "Public article not found",
      "Public event not found",
      "Public page not found",
      "Public gallery not found",
    ].includes(message)) {
      throw new PublicStorefrontNotFoundError();
    }
    throw error;
  });

  const appearance = captured.business?.appearanceSettings ?? {};
  const seoTitle = typeof appearance.seoTitle === "string" ? appearance.seoTitle.trim() : "";
  const seoDescription = typeof appearance.seoDescription === "string" ? appearance.seoDescription.trim() : "";
  const shareImage = typeof appearance.shareImageUrl === "string" ? appearance.shareImageUrl.trim() : "";

  return {
    slug,
    customDomain,
    canonicalUrl: `${url.origin}${url.pathname}`,
    title: seoTitle || snapshot.title,
    description: seoDescription || snapshot.description,
    image: shareImage || snapshot.image,
    body: snapshot.body,
    jsonLd: snapshot.jsonLd,
  };
});

export function getNextStorefrontPage(requestUrl: string) {
  return loadStorefrontPage(requestUrl);
}

export function isPublicStorefrontNotFound(error: unknown): boolean {
  return error instanceof PublicStorefrontNotFoundError;
}
