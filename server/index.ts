import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { sql } from "kysely";
import fastifyStatic from "@fastify/static";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { escapeHtml, injectCrawlerHtml, isCrawlerUserAgent, isPublicStorefrontPath, isPublicCustomDomainPath, normalizeDomainHost } from "./storefrontPrerender";

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

function storefrontSnapshot(data: any, pathname: string, origin: string, customDomain = false, canonicalPath = pathname): { title: string; description: string; body: string; image?: string; jsonLd?: unknown } {
  const business = data.business;
  const base = customDomain ? origin : `${origin}/${encodeURIComponent(business.slug)}`;
  const pathSegments = pathname.split("/").filter(Boolean);
  const segments = customDomain ? pathSegments : pathSegments.slice(1);
  const [kind, contentSlug] = segments;
  const links = (data.products ?? []).filter((item: any) => item.available).map((item: any) =>
    `<li><a href="${base}/p/${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</li>`).join("");
  const intro = business.description ? `<p>${escapeHtml(business.description)}</p>` : "";
  const image = business.heroImageUrl || business.logoUrl;
  if (!kind) {
    return {
      title: `${business.name} — Oni247`,
      description: business.description || `Explore products and services from ${business.name}.`,
      image: image || undefined,
      body: `<main><h1>${escapeHtml(business.name)}</h1>${intro}${business.heroHeadline ? `<h2>${escapeHtml(business.heroHeadline)}</h2>` : ""}${business.heroSubtext ? `<p>${escapeHtml(business.heroSubtext)}</p>` : ""}${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(business.name)}" />` : ""}<h2>Products</h2><ul>${links}</ul><p><a href="${base}/products">Browse products</a> · <a href="${base}/contact">Contact ${escapeHtml(business.name)}</a></p></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "Store", name: business.name, url: base, description: business.description || undefined, image: image || undefined },
    };
  }
  if (kind === "p") {
    const product = (data.products ?? []).find((item: any) => item.slug === contentSlug && item.available);
    if (!product || !business.canUseProductLinks) throw new Error("Public product not found");
    const description = product.description || `${product.name} from ${business.name}.`;
    return {
      title: `${product.name} — ${business.name}`,
      description,
      image: product.imageUrl || undefined,
      body: `<main><nav><a href="${base}">${escapeHtml(business.name)}</a> / <a href="${base}/products">Products</a></nav><h1>${escapeHtml(product.name)}</h1>${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" />` : ""}<p>${escapeHtml(description)}</p><p>${escapeHtml(product.currency)} ${escapeHtml(product.price)}</p><p><a href="${base}/products">Browse more products</a></p></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "Product", name: product.name, description, image: product.imageUrl ? [product.imageUrl] : undefined, offers: { "@type": "Offer", priceCurrency: product.currency, price: product.price, availability: "https://schema.org/InStock" } },
    };
  }
  if (kind === "b") {
    const post = (data.blogPosts ?? []).find((item: any) => item.slug === contentSlug);
    if (!post) throw new Error("Public article not found");
    const description = post.excerpt || post.title;
    return {
      title: `${post.title} — ${business.name}`,
      description,
      image: post.coverImageUrl || undefined,
      body: `<main><nav><a href="${base}">${escapeHtml(business.name)}</a> / <a href="${base}/blog">Blog</a></nav><article><h1>${escapeHtml(post.title)}</h1>${post.coverImageUrl ? `<img src="${escapeHtml(post.coverImageUrl)}" alt="${escapeHtml(post.title)}" />` : ""}<p>${escapeHtml(description)}</p><div>${post.content ?? ""}</div></article></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description, datePublished: post.publishedAt || undefined, image: post.coverImageUrl ? [post.coverImageUrl] : undefined, author: { "@type": "Organization", name: business.name }, mainEntityOfPage: `${origin}${canonicalPath}` },
    };
  }
  if (kind === "e") {
    const event = (data.events ?? []).find((item: any) => item.slug === contentSlug);
    if (!event) throw new Error("Public event not found");
    return {
      title: `${event.title} — ${business.name}`,
      description: event.description || `Event hosted by ${business.name}.`,
      image: event.coverImageUrl || undefined,
      body: `<main><nav><a href="${base}">${escapeHtml(business.name)}</a> / <a href="${base}/events">Events</a></nav><article><h1>${escapeHtml(event.title)}</h1>${event.coverImageUrl ? `<img src="${escapeHtml(event.coverImageUrl)}" alt="${escapeHtml(event.title)}" />` : ""}<p>${escapeHtml(event.description)}</p><p>${escapeHtml(event.startsAt)}${event.endsAt ? ` – ${escapeHtml(event.endsAt)}` : ""}</p>${event.venue ? `<p>${escapeHtml(event.venue)}</p>` : ""}</article></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "Event", name: event.title, description: event.description, startDate: event.startsAt, endDate: event.endsAt || undefined, location: event.venue ? { "@type": "Place", name: event.venue } : undefined, image: event.coverImageUrl ? [event.coverImageUrl] : undefined, organizer: { "@type": "Organization", name: business.name }, url: `${origin}${pathname}` },
    };
  }
  const pageTitles: Record<string, string> = { products: "Products", services: "Services", about: "About", gallery: "Gallery", blog: "Blog", events: "Events", contact: "Contact" };
  const pageTitle = pageTitles[kind];
  if (!pageTitle || !business.canUseMultiPage) throw new Error("Public page not found");
  const body = kind === "blog"
    ? (data.blogPosts ?? []).map((post: any) => `<li><a href="${base}/b/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a><p>${escapeHtml(post.excerpt || "")}</p></li>`).join("")
    : kind === "events"
      ? (data.events ?? []).map((event: any) => `<li><a href="${base}/e/${encodeURIComponent(event.slug)}">${escapeHtml(event.title)}</a><p>${escapeHtml(event.description)}</p></li>`).join("")
      : kind === "services"
        ? (data.services ?? []).map((service: any) => `<li><h2>${escapeHtml(service.name)}</h2><p>${escapeHtml(service.description)}</p></li>`).join("")
        : kind === "about" ? intro
          : kind === "products" ? links
            : `<p>Visit ${escapeHtml(business.name)} for more information.</p>`;
  return {
    title: `${pageTitle} — ${business.name}`,
    description: business.description || `${pageTitle} from ${business.name}.`,
    body: `<main><nav><a href="${base}">${escapeHtml(business.name)}</a></nav><h1>${escapeHtml(pageTitle)}</h1>${kind === "products" || kind === "services" || kind === "blog" || kind === "events" ? `<ul>${body}</ul>` : body}</main>`,
    jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: `${pageTitle} — ${business.name}`, url: `${origin}${canonicalPath}`, isPartOf: { "@type": "WebSite", name: business.name, url: base } },
  };
}

async function renderCrawlerStorefront(request: FastifyRequest, reply: FastifyReply) {
  const userAgent = String(request.headers["user-agent"] ?? "");
  if (!isCrawlerUserAgent(userAgent)) return;
  if (!hasProductionBuild) return;
  const url = new URL(request.url, `${request.protocol}://${request.host}`);
  let customDomain = false;
  let slug = "";
  let routePath = url.pathname;
  let parts = url.pathname.split("/").filter(Boolean);
  const configuredPlatformHost = normalizeDomainHost(process.env.APP_BASE_URL);
  if (!configuredPlatformHost || configuredPlatformHost !== url.hostname.toLowerCase()) {
    try {
      const { db } = await import("../helpers/db");
      const customDomainBusinesses = await db.selectFrom("businesses")
        .select(["slug", "customDomain"])
        .where("status", "=", "published")
        .where("customDomainStatus", "=", "verified")
        .execute();
      const matchedBusiness = customDomainBusinesses.find(
        (business) => normalizeDomainHost(business.customDomain) === url.hostname.toLowerCase(),
      );
      if (matchedBusiness) {
        if (!isPublicCustomDomainPath(url.pathname)) return;
        customDomain = true;
        slug = matchedBusiness.slug;
        routePath = `/${encodeURIComponent(slug)}${url.pathname === "/" ? "" : url.pathname}`;
      }
    } catch (error) {
      request.log.warn({ err: error, host: url.hostname }, "Custom-domain crawler lookup failed");
      return;
    }
  }
  if (!customDomain) {
    if (!isPublicStorefrontPath(url.pathname)) return;
    slug = decodeURIComponent(parts[0]);
  }
  try {
    const endpoint = await import("../endpoints/storefront_GET");
    const response = await endpoint.handle(new Request(`http://localhost/_api/storefront?slug=${encodeURIComponent(slug)}`));
    if (!response.ok) {
      if (response.status === 404) return reply.code(404).type("text/html; charset=utf-8").send("<!doctype html><title>Storefront not found</title><h1>Storefront not found</h1>");
      return;
    }
    const superjson = (await import("superjson")).default;
    const data = superjson.parse<any>(await response.text());
    let snapshot: { title: string; description: string; body: string; image?: string; jsonLd?: unknown };
    const section = customDomain ? parts[0] : parts[1];
    const detailSlug = customDomain ? parts[1] : parts[2];
    if (section === "gallery" && !detailSlug) {
      const galleryListEndpoint = await import("../endpoints/galleries/publicList_GET");
      const galleryListResponse = await galleryListEndpoint.handle(new Request(`http://localhost/_api/galleries/publicList?slug=${encodeURIComponent(slug)}`));
      if (!galleryListResponse.ok) return reply.code(404).type("text/html; charset=utf-8").send("<!doctype html><title>Gallery not found</title><h1>Gallery not found</h1>");
      const galleryListData = superjson.parse<any>(await galleryListResponse.text());
      const galleries = galleryListData.galleries ?? [];
      const description = `Photos and project galleries from ${data.business.name}.`;
      snapshot = {
        title: `Gallery — ${data.business.name}`,
        description,
        body: `<main><h1>Gallery</h1><p>${escapeHtml(description)}</p><ul>${galleries.map((gallery: any) => `<li><a href="/${encodeURIComponent(slug)}/g/${encodeURIComponent(gallery.slug)}">${escapeHtml(gallery.name)}</a>${gallery.description ? `<p>${escapeHtml(gallery.description)}</p>` : ""}${gallery.coverImageUrl ? `<img src="${escapeHtml(gallery.coverImageUrl)}" alt="${escapeHtml(gallery.name)}" />` : ""}</li>`).join("")}</ul></main>`,
        jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: `Gallery — ${data.business.name}`, description, url: `${url.origin}${url.pathname}` },
      };
    } else if (section === "g" && detailSlug) {
      const galleryEndpoint = await import("../endpoints/galleries/public_GET");
      const galleryResponse = await galleryEndpoint.handle(new Request(`http://localhost/_api/galleries/public?slug=${encodeURIComponent(slug)}&gallerySlug=${encodeURIComponent(decodeURIComponent(detailSlug))}`));
      if (!galleryResponse.ok) return reply.code(404).type("text/html; charset=utf-8").send("<!doctype html><title>Gallery not found</title><h1>Gallery not found</h1>");
      const galleryData = superjson.parse<any>(await galleryResponse.text());
      const gallery = galleryData.gallery;
      const description = gallery.description || `Photos from ${gallery.name} at ${galleryData.business.name}.`;
      snapshot = {
        title: `${gallery.name} — ${galleryData.business.name}`,
        description,
        image: gallery.coverImageUrl || gallery.images[0]?.imageUrl || undefined,
        body: `<main><nav><a href="${customDomain ? "/" : `/${encodeURIComponent(slug)}`}">${escapeHtml(galleryData.business.name)}</a> / <a href="${customDomain ? "/gallery" : `/${encodeURIComponent(slug)}/gallery`}">Gallery</a></nav><h1>${escapeHtml(gallery.name)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}<div>${gallery.images.map((image: any) => `<figure><img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.altText || image.caption || gallery.name)}" />${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>`).join("")}</div></main>`,
        jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: gallery.name, description, url: `${url.origin}${url.pathname}`, image: gallery.images.slice(0, 10).map((image: any) => image.imageUrl) },
      };
    } else {
      snapshot = storefrontSnapshot(data, routePath, url.origin, customDomain, url.pathname);
    }
    const canonical = `${url.origin}${url.pathname}`;
    const jsonLd = JSON.stringify(snapshot.jsonLd ?? {}).replace(/</g, "\\u003c");
    const metadata = `<title>${escapeHtml(snapshot.title)}</title><meta name="description" content="${escapeHtml(snapshot.description.slice(0, 160))}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(snapshot.title)}"><meta property="og:description" content="${escapeHtml(snapshot.description.slice(0, 200))}"><meta property="og:site_name" content="Oni247"><meta name="twitter:title" content="${escapeHtml(snapshot.title)}"><meta name="twitter:description" content="${escapeHtml(snapshot.description.slice(0, 200))}"><meta property="og:url" content="${escapeHtml(canonical)}">${snapshot.image ? `<meta property="og:image" content="${escapeHtml(snapshot.image)}"><meta name="twitter:image" content="${escapeHtml(snapshot.image)}">` : ""}<meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${jsonLd}</script>`;
    const indexHtml = await (await import("node:fs/promises")).readFile(path.join(distDir, "index.html"), "utf8");
    const html = injectCrawlerHtml(indexHtml, metadata, snapshot.body);
    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return reply.type("text/html; charset=utf-8").send(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (["Public product not found", "Public article not found", "Public event not found", "Public page not found"].includes(message)) {
      return reply.code(404).type("text/html; charset=utf-8").send("<!doctype html><title>Page not found</title><h1>Page not found</h1>");
    }
    request.log.warn({ err: error, path: url.pathname }, "Crawler storefront snapshot unavailable; serving SPA fallback");
  }
}


// Intercept only crawler requests for public storefront paths. Human visitors
// continue through the unchanged SPA fallback.
const crawlerStorefrontRoute = async (request: FastifyRequest, reply: FastifyReply) => {
  const rendered = await renderCrawlerStorefront(request, reply);
  return rendered ?? reply.callNotFound();
};
app.get("/", crawlerStorefrontRoute);
app.get("/:slug", crawlerStorefrontRoute);
app.get("/:slug/*", crawlerStorefrontRoute);


const distDir = path.join(projectRoot, "dist");
const hasProductionBuild = existsSync(path.join(distDir, "index.html"));
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
