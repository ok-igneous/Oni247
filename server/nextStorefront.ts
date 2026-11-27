import { cache } from "react";
import { sql } from "kysely";
import superjson from "superjson";
import { createCrawlerSnapshotLoader } from "./crawlerSnapshotLoader";
import { loadPlanConfig } from "../helpers/planConfig";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import {
  isPlatformHostname,
  isPublicCustomDomainPath,
  isPublicStorefrontPath,
  normalizeDomainHost,
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
  hostname === "::1" ||
  hostname === "[::1]";

const loadStorefrontPage = cache(async (requestUrl: string): Promise<NextStorefrontPage | null> => {
  const url = new URL(requestUrl);
  const hostname = url.hostname.toLowerCase();
  const configuredRoot = process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || null;
  const normalizedRoot = normalizeDomainHost(configuredRoot);
  // Fail closed on unknown hosts: only localhost, the configured platform
  // apex/www host, or an explicitly verified custom domain may resolve a shop.
  const platformHost =
    isLocalHost(hostname) ||
    (normalizedRoot !== null && isPlatformHostname(hostname, configuredRoot));

  let slug: string | null = null;
  let customDomain = false;

  if (platformHost) {
    if (!isPublicStorefrontPath(url.pathname)) return null;
    slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] ?? "");
  } else {
    const requestHost = normalizeDomainHost(`https://${hostname}`);
    if (!requestHost) throw new PublicStorefrontNotFoundError();

    await loadPlanConfig();
    const { db } = await import("../helpers/db");
    const normalizedStoredHost = sql<string | null>`case
      when lower("custom_domain") like 'http://%' then null
      else lower(split_part(split_part(regexp_replace("custom_domain", '^https?://', '', 'i'), '/', 1), ':', 1))
    end`;
    const business = await db
      .selectFrom("businesses")
      .select(["slug", "plan", "websitePlan", "trialEndsAt", "planRenewsAt", "premiumTrialUsed"])
      .where("status", "=", "published")
      .where("customDomainStatus", "=", "verified")
      .where(normalizedStoredHost, "=", requestHost)
      .limit(1)
      .executeTakeFirst();

    if (!business || !subscriptionPlan.resolve(business).canUseCustomDomain) {
      throw new PublicStorefrontNotFoundError();
    }
    slug = business.slug;
    customDomain = true;

    if (!isPublicCustomDomainPath(url.pathname)) {
      const firstSegment = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
      if (firstSegment && PRIVATE_CUSTOM_DOMAIN_ROOTS.has(firstSegment)) return null;
      throw new PublicStorefrontNotFoundError();
    }
  }

  if (!slug) return null;

  // Keep the platform apex as the canonical host even when a visitor arrives
  // through its www alias. Custom domains retain their own verified origin.
  const canonicalOrigin =
    customDomain || isLocalHost(hostname) || !normalizedRoot
      ? url.origin
      : `https://${normalizedRoot}`;

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
    origin: canonicalOrigin,
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
  const isStoreHome = customDomain
    ? url.pathname === "/"
    : url.pathname.split("/").filter(Boolean).length === 1;
  const seoTitle = isStoreHome && typeof appearance.seoTitle === "string" ? appearance.seoTitle.trim() : "";
  const seoDescription = isStoreHome && typeof appearance.seoDescription === "string" ? appearance.seoDescription.trim() : "";
  const shareImage = typeof appearance.shareImageUrl === "string" ? appearance.shareImageUrl.trim() : "";

  return {
    slug,
    customDomain,
    canonicalUrl: `${canonicalOrigin}${url.pathname}`,
    title: seoTitle || snapshot.title,
    description: seoDescription || snapshot.description,
    image: isStoreHome ? shareImage || snapshot.image : snapshot.image || shareImage,
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
