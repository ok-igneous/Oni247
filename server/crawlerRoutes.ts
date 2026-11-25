import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export type CrawlerStorefrontRenderer = (
  request: FastifyRequest<any, any>,
  reply: FastifyReply<any, any>,
) => Promise<unknown> | unknown;

/**
 * Register the URL surface used by vanity storefronts and verified custom
 * domains. The renderer decides whether a request is a crawler/public route;
 * returning undefined leaves normal SPA handling to Fastify's not-found hook.
 */
export function registerCrawlerStorefrontRoutes(
  app: FastifyInstance<any>,
  render: CrawlerStorefrontRenderer,
): void {
  const handler = async (request: FastifyRequest<any, any>, reply: FastifyReply<any, any>) => {
    // The same URL intentionally serves crawler HTML or the normal SPA shell.
    // Shared caches must not reuse one representation for the other user agent.
    reply.header("Vary", "User-Agent");
    const rendered = await render(request, reply);
    return rendered ?? reply.callNotFound();
  };

  app.get("/", handler);
  app.get("/:slug", handler);
  app.get("/:slug/*", handler);
}
