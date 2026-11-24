import type { FastifyReply, FastifyRequest } from "fastify";
import { escapeHtml, isCrawlerUserAgent, isPublicCustomDomainPath, isPublicStorefrontPath, normalizeDomainHost } from "./storefrontPrerender";
import { renderCrawlerDocument, type CrawlerSnapshot } from "./crawlerDocument";

export type CrawlerSnapshotRequest = {
  slug: string;
  pathname: string;
  origin: string;
  customDomain: boolean;
};

export type CrawlerRendererDependencies = {
  hasProductionBuild: boolean;
  resolveCustomDomain(hostname: string): Promise<string | null>;
  loadSnapshot(input: CrawlerSnapshotRequest): Promise<CrawlerSnapshot>;
  readIndexHtml(): Promise<string>;
};

function unavailable(reply: FastifyReply) {
  reply.header("Cache-Control", "no-store");
  reply.header("Retry-After", "30");
  return reply.code(503).type("text/html; charset=utf-8").send(
    "<!doctype html><title>Storefront temporarily unavailable</title><meta name=\"robots\" content=\"noindex\"><h1>Storefront temporarily unavailable</h1>",
  );
}

function notFound(reply: FastifyReply) {
  return reply.code(404).type("text/html; charset=utf-8").send(
    "<!doctype html><title>Page not found</title><meta name=\"robots\" content=\"noindex\"><h1>Page not found</h1>",
  );
}

/** Creates the crawler-only renderer with injectable data and filesystem dependencies. */
export function createCrawlerStorefrontRenderer(deps: CrawlerRendererDependencies) {
  return async function renderCrawlerStorefront(request: FastifyRequest, reply: FastifyReply) {
    if (!isCrawlerUserAgent(String(request.headers["user-agent"] ?? ""))) return;
    if (!deps.hasProductionBuild) return;

    try {
      const url = new URL(request.url, `${request.protocol}://${request.host}`);
      const parts = url.pathname.split("/").filter(Boolean);
      const configuredPlatformHost = normalizeDomainHost(process.env.APP_BASE_URL);
      let customDomain = false;
      let slug = "";

      if (!configuredPlatformHost || configuredPlatformHost !== url.hostname.toLowerCase()) {
        const matchedSlug = await deps.resolveCustomDomain(url.hostname.toLowerCase());
        if (matchedSlug) {
          if (!isPublicCustomDomainPath(url.pathname)) return;
          customDomain = true;
          slug = matchedSlug;
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
