import { getStorefrontBaseUrl } from "./storefrontCanonical";

/** Build an internal storefront path that stays at the domain root on custom domains/subdomains. */
export function storefrontPath(businessSlug: string, path = "/"): string {
  const suffix = path.replace(/^\\/+/, "");
  if (typeof window === "undefined") return `/${encodeURIComponent(businessSlug)}/${suffix}`;
  const base = getStorefrontBaseUrl(businessSlug, window.location.origin, window.location.pathname);
  const basePath = new URL(base).pathname;
  return `${basePath}${suffix}`;
}
