import { isCrawlerUserAgent, isPublicCustomDomainPath, isPublicStorefrontPath, normalizeDomainHost, resolvePlatformSubdomainSlug, isPlatformHostname } from "./storefrontPrerender";
import { renderCrawlerDocument, type CrawlerSnapshot } from "./crawlerDocument";

export type CrawlerSnapshotRequest = {
  slug: string;
  pathname: string;
  origin: string;
  customDomain: boolean;
};

export type CrawlerRendererDependencies = {
  hasProductionBuild: boolean;
  resolvePlatformSubdomain(slug: string): Promise<string | null>;
  resolveCustomDomain(hostname: string): Promise<string | null>;
  loadSnapshot(input: CrawlerSnapshotRequest): Promise<CrawlerSnapshot>;
  readIndexHtml(): Promise<string>;
};

function unavailable(reply: any) {
  reply.header("Cache-Control", "no-store");
  reply.header("Retry-After", "30");
  return reply.code(503).type("text/html; charset=utf-8").send(
    "<!doctype html><title>Storefront temporarily unavailable</title><meta name=\"robots\" content=\"noindex\"><h1>Storefront temporarily unavailable</h1>",
  );
}

function notFound(reply: any) {
  return reply.code(404).type("text/html; charset=utf-8").send(
    "<!doctype html><title>Page not found</title><meta name=\"robots\" content=\"noindex\"><h1>Page not found</h1>",
  );
}

/** Creates the crawler-only renderer with injectable data and filesystem dependencies. */
export function createCrawlerStorefrontRenderer(deps: CrawlerRendererDependencies) {
  return async function renderCrawlerStorefront(request: any, reply: any) {
    if (!isCrawlerUserAgent(String(request.headers["user-agent"] ?? ""))) return;
    if (!deps.hasProductionBuild) return;

    try {
      const url = new URL(request.url, `${request.protocol}://${request.host}`);
      const parts = url.pathname.split("/").filter(Boolean);
      const configuredPlatformHost = normalizeDomainHost(process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL);
      let customDomain = false;
      let slug = "";

      const platformSubdomainSlug = resolvePlatformSubdomainSlug(url.hostname, configuredPlatformHost);
      if (platformSubdomainSlug) {
        const matchedSlug = await deps.resolvePlatformSubdomain(platformSubdomainSlug);
        if (matchedSlug) {
          if (!isPublicCustomDomainPath(url.pathname)) return;
          customDomain = true;
          slug = matchedSlug;
        }
      }

      if (!customDomain && !isPlatformHostname(url.hostname, configuredPlatformHost)) {
        const requestHost = normalizeDomainHost(`https://${url.hostname}`);
        if (requestHost) {
          const matchedSlug = await deps.resolveCustomDomain(requestHost);
          if (matchedSlug) {
            if (!isPublicCustomDomainPath(url.pathname)) return;
            customDomain = true;
            slug = matchedSlug;
          }
        }
      }

      if (!customDomain) {
        if (!isPublicStorefrontPath(url.pathname)) return;
        slug = decodeURIComponent(parts[0]);
      }

      const snapshot = await deps.loadSnapshot({
        slug,
        pathname: url.pathname,
        origin: url.origin,
        customDomain,
      });
      const indexHtml = await deps.readIndexHtml();
      const html = renderCrawlerDocument({
        indexHtml,
        snapshot,
        canonicalUrl: `${url.origin}${url.pathname}`,
      });
      reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return reply.type("text/html; charset=utf-8").send(html);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if ([
        "Public product not found",
        "Public article not found",
        "Public event not found",
        "Public page not found",
        "Public gallery not found",
        "Public storefront not found",
      ].includes(message)) return notFound(reply);
      request.log.warn({ err: error, path: request.url }, "Crawler storefront snapshot unavailable");
      return unavailable(reply);
    }
  };
}
