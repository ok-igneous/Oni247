import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { sql } from "kysely";
import fastifyStatic from "@fastify/static";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { escapeHtml, normalizeDomainHost } from "./storefrontPrerender";
import { storefrontSnapshot } from "./storefrontSnapshot";
import { registerCrawlerStorefrontRoutes } from "./crawlerRoutes";
import { createCrawlerStorefrontRenderer } from "./crawlerRenderer";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const endpointsRoot = path.join(projectRoot, "endpoints");
// Do not trust client-supplied X-Forwarded-* headers unless deployment explicitly
// declares a trusted reverse-proxy hop count (or opts into full proxy trust).
const trustProxySetting = process.env.TRUST_PROXY?.trim().toLowerCase();
const trustProxy = trustProxySetting === "true"
  ? true
  : trustProxySetting && /^\d+$/.test(trustProxySetting)
    ? Number(trustProxySetting)
    : false;

const app = Fastify({ logger: true, bodyLimit: 60 * 1024 * 1024, trustProxy });

type EndpointModule = { handle?: (request: Request) => Promise<Response> | Response };
const endpointFiles = new Map<string, string>();
const methodSuffix = /_(GET|POST|PUT|PATCH|DELETE)\.ts$/;

async function discoverEndpoints(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await discoverEndpoints(fullPath);
    else if (entry.isFile() && methodSuffix.test(entry.name)) {
      const relative = path.relative(endpointsRoot, fullPath).split(path.sep).join("/");
      const match = relative.match(methodSuffix);
      if (!match) continue;
      endpointFiles.set(`${match[1]} ${relative.replace(methodSuffix, "")}`, fullPath);
    }
  }
}

await discoverEndpoints(endpointsRoot);

app.addHook("onSend", async (request, reply, payload) => {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
  reply.header("X-Frame-Options", "SAMEORIGIN");
  if (process.env.NODE_ENV === "production") {
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return payload;
});

app.removeAllContentTypeParsers();
app.addContentTypeParser("*", { parseAs: "buffer" }, (_request, body, done) => done(null, body));

async function invokeEndpoint(
  method: string,
  route: string,
  request: FastifyRequest,
  reply: FastifyReply,
  originOverride?: string,
) {
  const file = endpointFiles.get(`${method} ${route}`);
  if (!file) return reply.code(404).send({ error: "API endpoint not found" });

  try {
    const endpoint = await import(pathToFileURL(file).href) as EndpointModule;
    if (typeof endpoint.handle !== "function") throw new Error(`Endpoint ${route} does not export handle()`);

    const headers = new Headers();
    const hopByHopHeaders = new Set(["host", "connection", "content-length", "transfer-encoding", "expect", "upgrade"]);
    for (const [key, value] of Object.entries(request.headers)) {
      if (hopByHopHeaders.has(key.toLowerCase())) continue;
      if (Array.isArray(value)) headers.set(key, value.join(", "));
      else if (value !== undefined) headers.set(key, value);
    }

    const body = request.body;
    const webRequest = new Request(new URL(request.url, originOverride ?? `${request.protocol}://${request.host}`), {
      method,
      headers,
      ...(body !== undefined && !["GET", "HEAD"].includes(method)
        ? { body: Buffer.isBuffer(body) ? body : Buffer.from(String(body)) }
        : {}),
    });
    // Resolve identity before entering the transaction: session lookup is the
    // authentication bootstrap and remains outside tenant RLS.
    // Only a genuine unauthenticated result may continue without user context.
    const [{ getServerUserSession }, { NotAuthenticatedError }, { withUserDatabaseContext }] =
      await Promise.all([
        import("../helpers/getServerUserSession"),
        import("../helpers/getSetServerSession"),
        import("../helpers/db"),
      ]);

    let authenticatedUserId: number | undefined;
    try {
      const auth = await getServerUserSession(webRequest);
      authenticatedUserId = auth.user.id;
    } catch (error) {
      if (!(error instanceof NotAuthenticatedError)) throw error;
    }

    // Consume the response body before leaving the request transaction. A
    // Response may wrap a lazy stream whose producer still performs DB reads;
    // consuming it after the transaction closes would lose tenant context.
    const executeEndpoint = async () => {
      const response = await endpoint.handle!(webRequest);
      const responseBody = [204, 304].includes(response.status)
        ? null
        : Buffer.from(await response.arrayBuffer());
      return { response, responseBody };
    };
    // Authentication endpoints operate only on bootstrap/auth tables, which are
    // deliberately excluded from tenant RLS. Keep them outside the request
    // transaction because they are bootstrap flows over auth tables, not tenant data.
    const isAuthenticationRoute = route.startsWith("auth/");
    const { response, responseBody } = authenticatedUserId && !isAuthenticationRoute
      ? await withUserDatabaseContext(authenticatedUserId, executeEndpoint)
      : await executeEndpoint();
    reply.code(response.status);
    const responseHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = responseHeaders.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
    });
    if (setCookies.length > 0) reply.header("set-cookie", setCookies);
    return reply.send(responseBody);
  } catch (error) {
    request.log.error({ err: error, route }, "API endpoint failed");
    return reply.code(500).send({ error: "Internal server error" });
  }
}

app.get("/healthz", async () => ({
  ok: true,
  service: "oni247-api",
  endpoints: endpointFiles.size,
}));
app.get("/readyz", async (request, reply) => {
  try {
    const { db } = await import("../helpers/db");
    await sql`select 1`.execute(db);
    return { ok: true, database: true };
  } catch (error) {
    request.log.error({ err: error }, "Readiness check failed");
    return reply.code(503).send({ ok: false, database: false });
  }
});
app.all("/_api/*", async (request, reply) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const route = decodeURIComponent(pathname.replace(/^\/_api\/?/, "")).replace(/\/$/, "");
  return invokeEndpoint(request.method.toUpperCase(), route, request, reply);
});

// The existing sitemap handler is now exposed at the conventional public URL.
app.get("/sitemap.xml", async (request, reply) =>
  invokeEndpoint("GET", "sitemap", request, reply, process.env.APP_BASE_URL?.trim() ? process.env.APP_BASE_URL.trim().replace(/\/+$/, "") : undefined),
);
app.get("/robots.txt", async (request, reply) => {
  const baseUrl = process.env.APP_BASE_URL?.trim() || `${request.protocol}://${request.host}`;
  const sitemap = new URL("/sitemap.xml", baseUrl).toString();
  return reply.type("text/plain; charset=utf-8").send(
    `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /login\nDisallow: /register\nDisallow: /track\nDisallow: /_api/\nSitemap: ${sitemap}\n`,
  );
});

// Serve database-backed public storefront HTML to crawlers while keeping the SPA
// for human visitors. Route matching and HTML injection are covered by unit tests.

const distDir = path.join(projectRoot, "dist");
const hasProductionBuild = existsSync(path.join(distDir, "index.html"));

const renderCrawlerStorefront = createCrawlerStorefrontRenderer({
  hasProductionBuild,
  resolveCustomDomain: async (hostname) => {
    const { db } = await import("../helpers/db");
    const businesses = await db.selectFrom("businesses")
      .select(["slug", "customDomain"])
      .where("status", "=", "published")
      .where("customDomainStatus", "=", "verified")
      .execute();
    return businesses.find((business) =>
      normalizeDomainHost(business.customDomain) === hostname,
    )?.slug ?? null;
  },
  loadSnapshot: async ({ slug, pathname, origin, customDomain }) => {
    const endpoint = await import("../endpoints/storefront_GET");
    const response = await endpoint.handle(new Request(`http://localhost/_api/storefront?slug=${encodeURIComponent(slug)}`));
    if (!response.ok) {
      if (response.status === 404) throw new Error("Public storefront not found");
      throw new Error(`Storefront endpoint returned ${response.status}`);
    }
    const superjson = (await import("superjson")).default;
    const data = superjson.parse<any>(await response.text());
    const parts = pathname.split("/").filter(Boolean);
    const section = customDomain ? parts[0] : parts[1];
    const detailSlug = customDomain ? parts[1] : parts[2];

    if (section === "gallery" && !detailSlug) {
      const galleryListEndpoint = await import("../endpoints/galleries/publicList_GET");
      const galleryResponse = await galleryListEndpoint.handle(new Request(`http://localhost/_api/galleries/publicList?slug=${encodeURIComponent(slug)}`));
      if (!galleryResponse.ok) throw new Error("Public gallery not found");
      const galleryData = superjson.parse<any>(await galleryResponse.text());
      const galleries = galleryData.galleries ?? [];
      const description = `Photos and project galleries from ${data.business.name}.`;
      return {
        title: `Gallery — ${data.business.name}`,
        description,
        image: galleries.find((gallery: any) => gallery.coverImageUrl)?.coverImageUrl || undefined,
        body: `<main><h1>Gallery</h1><p>${escapeHtml(description)}</p><ul>${galleries.map((gallery: any) => `<li><a href="${customDomain ? `/g/${encodeURIComponent(gallery.slug)}` : `/${encodeURIComponent(slug)}/g/${encodeURIComponent(gallery.slug)}`}">${escapeHtml(gallery.name)}</a>${gallery.description ? `<p>${escapeHtml(gallery.description)}</p>` : ""}${gallery.coverImageUrl ? `<img src="${escapeHtml(gallery.coverImageUrl)}" alt="${escapeHtml(gallery.name)}" />` : ""}</li>`).join("")}</ul></main>`,
        jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: `Gallery — ${data.business.name}`, description, url: `${origin}${pathname}` },
      };
    }
    if (section === "g" && detailSlug) {
      const galleryEndpoint = await import("../endpoints/galleries/public_GET");
      const galleryResponse = await galleryEndpoint.handle(new Request(`http://localhost/_api/galleries/public?slug=${encodeURIComponent(slug)}&gallerySlug=${encodeURIComponent(decodeURIComponent(detailSlug))}`));
      if (!galleryResponse.ok) throw new Error("Public gallery not found");
      const galleryData = superjson.parse<any>(await galleryResponse.text());
      const gallery = galleryData.gallery;
      const description = gallery.description || `Photos from ${gallery.name} at ${galleryData.business.name}.`;
      return {
        title: `${gallery.name} — ${galleryData.business.name}`,
        description,
        image: gallery.coverImageUrl || gallery.images[0]?.imageUrl || undefined,
        body: `<main><nav><a href="${customDomain ? "/" : `/${encodeURIComponent(slug)}`}">${escapeHtml(galleryData.business.name)}</a> / <a href="${customDomain ? "/gallery" : `/${encodeURIComponent(slug)}/gallery`}">Gallery</a></nav><h1>${escapeHtml(gallery.name)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}<div>${gallery.images.map((image: any) => `<figure><img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.altText || image.caption || gallery.name)}" />${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>`).join("")}</div></main>`,
        jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: gallery.name, description, url: `${origin}${pathname}`, image: gallery.images.slice(0, 10).map((image: any) => image.imageUrl) },
      };
    }
    return storefrontSnapshot(data, pathname, origin, customDomain, pathname);
  },
  readIndexHtml: () => import("node:fs/promises").then(({ readFile }) =>
    readFile(path.join(distDir, "index.html"), "utf8"),
  ),
});


// Intercept only crawler requests for public storefront paths. Human visitors
// continue through the unchanged SPA fallback.
registerCrawlerStorefrontRoutes(app, renderCrawlerStorefront);


if (hasProductionBuild) {
  await app.register(fastifyStatic, {
    root: distDir,
    prefix: "/",
    wildcard: false,
    decorateReply: true,
  });
}
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith("/_api/")) return reply.code(404).send({ error: "Not found" });
  if (request.method !== "GET" && request.method !== "HEAD") return reply.code(404).send({ error: "Not found" });
  if (!hasProductionBuild) return reply.code(404).send({ error: "Frontend build not found. Run npm run build." });
  return reply.type("text/html; charset=utf-8").sendFile("index.html");
});

app.addHook("onClose", async () => {
  if (process.env.DATABASE_URL) {
    const { closeDatabase } = await import("../helpers/db");
    await closeDatabase();
  }
});

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const host = process.env.HOST ?? "0.0.0.0";
await app.listen({ port, host });

let shutdownStarted = false;
const shutdown = async (signal: NodeJS.Signals) => {
  if (shutdownStarted) return;
  shutdownStarted = true;
  app.log.info({ signal }, "Shutting down Oni247 API");
  try {
    await app.close();
  } catch (error) {
    app.log.error({ err: error }, "Graceful shutdown failed");
    process.exitCode = 1;
  }
};
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
