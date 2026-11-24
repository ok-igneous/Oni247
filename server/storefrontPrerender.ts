export const isCrawlerUserAgent = (value: string): boolean =>
  /googlebot|bingbot|duckduckbot|yandexbot|baiduspider|slurp|facebookexternalhit|twitterbot|linkedinbot/i.test(value);

export const escapeHtml = (value: unknown): string => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const RESERVED_ROOTS = new Set([
  "_api", "assets", "src", "static", "dashboard", "admin", "login", "register",
  "logout", "forgot-password", "reset-password", "track", "healthz", "readyz",
  "robots.txt", "sitemap.xml", "favicon.ico", "manifest.webmanifest",
]);

const STOREFRONT_SECTIONS = new Set([
  "p", "b", "e", "g", "products", "services", "about", "gallery", "blog",
  "events", "contact",
]);

/** Only vanity storefront paths are eligible; static, API and account routes are excluded. */
export function isPublicStorefrontPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 1 || segments.length > 3) return false;
  const [slug, section, detail] = segments;
  if (RESERVED_ROOTS.has(slug.toLowerCase()) || !/^[a-z0-9][a-z0-9-]{0,119}$/i.test(slug)) return false;
  if (!section) return true;
  if (!STOREFRONT_SECTIONS.has(section.toLowerCase())) return false;
  if (["p", "b", "e", "g"].includes(section.toLowerCase())) {
    return Boolean(detail && /^[^/]{1,160}$/.test(detail));
  }
  return !detail;
}

/** Insert metadata and crawlable body into the built SPA shell. */
export function injectCrawlerHtml(indexHtml: string, metadata: string, body: string): string {
  if (!/<div id="root">\s*<\/div>/i.test(indexHtml)) {
    throw new Error('Built HTML is missing the expected React root element');
  }
  const withoutTitle = indexHtml.replace(/<title>[^<]*<\/title>/i, "");
  return withoutTitle
    .replace("</head>", `${metadata}</head>`)
    .replace(/<div id="root">\s*<\/div>/i, `<div id="root">${body}</div>`);
}

/** Public paths served from a verified custom-domain root (without a business slug). */
export function isPublicCustomDomainPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 1 || segments.length > 2) return false;
  const [section, detail] = segments;
  if (!STOREFRONT_SECTIONS.has(section.toLowerCase())) return false;
  if (["p", "b", "e", "g"].includes(section.toLowerCase())) {
    return Boolean(detail && /^[^/]{1,160}$/.test(detail));
  }
  return !detail;
}

/** Normalize a configured HTTPS custom domain for exact Host-header matching. */
export function normalizeDomainHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}


/** Resolve a single-label business subdomain under the configured platform root. */
export function resolvePlatformSubdomainSlug(
  hostname: string | null | undefined,
  platformRoot: string | null | undefined,
): string | null {
  const host = normalizeDomainHost(hostname);
  const root = normalizeDomainHost(platformRoot);
  if (!host || !root || host === root) return null;

  const suffix = `.${root}`;
  if (!host.endsWith(suffix)) return null;
  const slug = host.slice(0, -suffix.length);
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) return null;
  if (RESERVED_ROOTS.has(slug)) return null;
  return slug;
}


/** True for the platform apex and its conventional www alias. */
export function isPlatformHostname(hostname: string, platformHost: string | null): boolean {
  const host = normalizeDomainHost(hostname);
  const root = normalizeDomainHost(platformHost);
  if (!host || !root) return false;
  const base = root.replace(/^www\./, "");
  return host === base || host === `www.${base}`;
}
