const ROOT_STOREFRONT_SEGMENTS = new Set([
  "p", "b", "e", "g", "products", "services", "about", "gallery", "blog",
  "events", "contact", "track", "checkout", "book", "booking", "f", "store",
]);

/**
 * Return the canonical storefront root for either a vanity URL or a domain root.
 * On custom domains, public routes start at /; on the platform host they start
 * at /{businessSlug}.
 */
export function getStorefrontBaseUrl(
  businessSlug: string,
  origin: string,
  pathname: string,
): string {
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  const isDomainRootRoute = !firstSegment || ROOT_STOREFRONT_SEGMENTS.has(firstSegment);
  const basePath = isDomainRootRoute ? "/" : `/${encodeURIComponent(businessSlug)}/`;
  return new URL(basePath, origin).toString();
}
