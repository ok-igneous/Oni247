import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { sql } from "kysely";
import fastifyStatic from "@fastify/static";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

// Serve useful, database-backed HTML to crawlers while preserving the existing
// client-rendered React application for normal visitors. This is intentionally
// limited to public storefront routes; dashboard and checkout flows stay SPA-only.
const htmlEscape = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const crawlerUserAgent = (value: string) =>
  /googlebot|bingbot|duckduckbot|yandexbot|baiduspider|slurp|facebookexternalhit|twitterbot|linkedinbot/i.test(value);

function storefrontSnapshot(data: any, pathname: string, origin: string): { title: string; description: string; body: string; jsonLd?: unknown } {
  const business = data.business;
  const base = `${origin}/${encodeURIComponent(business.slug)}`;
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const [kind, contentSlug] = segments;
  const links = (data.products ?? []).filter((item: any) => item.available).map((item: any) =>
    `<li><a href="${base}/p/${encodeURIComponent(item.slug)}">${htmlEscape(item.name)}</a>${item.description ? `<p>${htmlEscape(item.description)}</p>` : ""}</li>`).join("");
  const intro = business.description ? `<p>${htmlEscape(business.description)}</p>` : "";
  const image = business.heroImageUrl || business.logoUrl;
  if (!kind) {
    return {
      title: `${business.name} — Oni247`,
      description: business.description || `Explore products and services from ${business.name}.`,
      body: `<main><h1>${htmlEscape(business.name)}</h1>${intro}${business.heroHeadline ? `<h2>${htmlEscape(business.heroHeadline)}</h2>` : ""}${business.heroSubtext ? `<p>${htmlEscape(business.heroSubtext)}</p>` : ""}${image ? `<img src="${htmlEscape(image)}" alt="${htmlEscape(business.name)}" />` : ""}<h2>Products</h2><ul>${links}</ul><p><a href="${base}/products">Browse products</a> · <a href="${base}/contact">Contact ${htmlEscape(business.name)}</a></p></main>`,
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
      body: `<main><nav><a href="${base}">${htmlEscape(business.name)}</a> / <a href="${base}/products">Products</a></nav><h1>${htmlEscape(product.name)}</h1>${product.imageUrl ? `<img src="${htmlEscape(product.imageUrl)}" alt="${htmlEscape(product.name)}" />` : ""}<p>${htmlEscape(description)}</p><p>${htmlEscape(product.currency)} ${htmlEscape(product.price)}</p><p><a href="${base}/products">Browse more products</a></p></main>`,
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
      body: `<main><nav><a href="${base}">${htmlEscape(business.name)}</a> / <a href="${base}/blog">Blog</a></nav><article><h1>${htmlEscape(post.title)}</h1>${post.coverImageUrl ? `<img src="${htmlEscape(post.coverImageUrl)}" alt="${htmlEscape(post.title)}" />` : ""}<p>${htmlEscape(description)}</p><div>${post.content ?? ""}</div></article></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description, datePublished: post.publishedAt || undefined, image: post.coverImageUrl ? [post.coverImageUrl] : undefined, author: { "@type": "Organization", name: business.name }, mainEntityOfPage: `${origin}${pathname}` },
    };
  }
  if (kind === "e") {
    const event = (data.events ?? []).find((item: any) => item.slug === contentSlug);
    if (!event) throw new Error("Public event not found");
    return {
      title: `${event.title} — ${business.name}`,
      description: event.description || `Event hosted by ${business.name}.`,
      body: `<main><nav><a href="${base}">${htmlEscape(business.name)}</a> / <a href="${base}/events">Events</a></nav><article><h1>${htmlEscape(event.title)}</h1>${event.coverImageUrl ? `<img src="${htmlEscape(event.coverImageUrl)}" alt="${htmlEscape(event.title)}" />` : ""}<p>${htmlEscape(event.description)}</p><p>${htmlEscape(event.startsAt)}${event.endsAt ? ` – ${htmlEscape(event.endsAt)}` : ""}</p>${event.venue ? `<p>${htmlEscape(event.venue)}</p>` : ""}</article></main>`,
      jsonLd: { "@context": "https://schema.org", "@type": "Event", name: event.title, description: event.description, startDate: event.startsAt, endDate: event.endsAt || undefined, location: event.venue ? { "@type": "Place", name: event.venue } : undefined, image: event.coverImageUrl ? [event.coverImageUrl] : undefined, organizer: { "@type": "Organization", name: business.name }, url: `${origin}${pathname}` },
    };
  }
  const pageTitles: Record<string, string> = { products: "Products", services: "Services", about: "About", gallery: "Gallery", blog: "Blog", events: "Events", contact: "Contact" };
  const pageTitle = pageTitles[kind];
  if (!pageTitle || !business.canUseMultiPage) throw new Error("Public page not found");
  const body = kind === "blog"
    ? (data.blogPosts ?? []).map((post: any) => `<li><a href="${base}/b/${encodeURIComponent(post.slug)}">${htmlEscape(post.title)}</a><p>${htmlEscape(post.excerpt || "")}</p></li>`).join("")
    : kind === "events"
      ? (data.events ?? []).map((event: any) => `<li><a href="${base}/e/${encodeURIComponent(event.slug)}">${htmlEscape(event.title)}</a><p>${htmlEscape(event.description)}</p></li>`).join("")
      : kind === "services"
        ? (data.services ?? []).map((service: any) => `<li><h2>${htmlEscape(service.name)}</h2><p>${htmlEscape(service.description)}</p></li>`).join("")
        : kind === "about" ? intro
          : kind === "products" ? links
            : `<p>Visit ${htmlEscape(business.name)} for more information.</p>`;
  return {
    title: `${pageTitle} — ${business.name}`,
    description: business.description || `${pageTitle} from ${business.name}.`,
    body: `<main><nav><a href="${base}">${htmlEscape(business.name)}</a></nav><h1>${htmlEscape(pageTitle)}</h1>${kind === "products" || kind === "services" || kind === "blog" || kind === "events" ? `<ul>${body}</ul>` : body}</main>`,
    jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: `${pageTitle} — ${business.name}`, url: `${origin}${pathname}`, isPartOf: { "@type": "WebSite", name: business.name, url: base } },
  };
}

async function renderCrawlerStorefront(request: FastifyRequest, reply: FastifyReply) {
  const userAgent = String(request.headers["user-agent"] ?? "");
  if (!crawlerUserAgent(userAgent)) return;
  if (!hasProductionBuild) return;
  const url = new URL(request.url, `${request.protocol}://${request.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  if (!parts.length || ["_api", "dashboard", "admin", "login", "register", "track", "healthz", "readyz", "robots.txt", "sitemap.xml"].includes(parts[0])) return;
  const slug = decodeURIComponent(parts[0]);
  try {
    const endpoint = await import("../endpoints/storefront_GET");
    const response = await endpoint.handle(new Request(`http://localhost/_api/storefront?slug=${encodeURIComponent(slug)}`));
    if (!response.ok) return;
    const superjson = (await import("superjson")).default;
    const data = superjson.parse<any>(await response.text());
    let snapshot: { title: string; description: string; body: string; jsonLd?: unknown };
    if (parts[1] === "g" && parts[2]) {
      const galleryEndpoint = await import("../endpoints/galleries/public_GET");
      const galleryResponse = await galleryEndpoint.handle(new Request(`http://localhost/_api/galleries/public?slug=${encodeURIComponent(slug)}&gallerySlug=${encodeURIComponent(decodeURIComponent(parts[2]))}`));
      if (!galleryResponse.ok) return reply.code(404).type("text/html; charset=utf-8").send("<!doctype html><title>Gallery not found</title><h1>Gallery not found</h1>");
      const galleryData = superjson.parse<any>(await galleryResponse.text());
      const gallery = galleryData.gallery;
      const description = gallery.description || `Photos from ${gallery.name} at ${galleryData.business.name}.`;
      snapshot = {
        title: `${gallery.name} — ${galleryData.business.name}`,
        description,
        body: `<main><nav><a href="/${encodeURIComponent(slug)}">${htmlEscape(galleryData.business.name)}</a> / <a href="/${encodeURIComponent(slug)}/gallery">Gallery</a></nav><h1>${htmlEscape(gallery.name)}</h1>${description ? `<p>${htmlEscape(description)}</p>` : ""}<div>${gallery.images.map((image: any) => `<figure><img src="${htmlEscape(image.imageUrl)}" alt="${htmlEscape(image.altText || image.caption || gallery.name)}" />${image.caption ? `<figcaption>${htmlEscape(image.caption)}</figcaption>` : ""}</figure>`).join("")}</div></main>`,
        jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: gallery.name, description, url: `${url.origin}${url.pathname}`, image: gallery.images.slice(0, 10).map((image: any) => image.imageUrl) },
      };
    } else {
      snapshot = storefrontSnapshot(data, url.pathname, url.origin);
    }
    const canonical = `${url.origin}${url.pathname}`;
    const jsonLd = JSON.stringify(snapshot.jsonLd ?? {}).replace(/</g, "\\u003c");
    const metadata = `<title>${htmlEscape(snapshot.title)}</title><meta name="description" content="${htmlEscape(snapshot.description.slice(0, 160))}"><link rel="canonical" href="${htmlEscape(canonical)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:title" content="${htmlEscape(snapshot.title)}"><meta property="og:description" content="${htmlEscape(snapshot.description.slice(0, 200))}"><meta property="og:url" content="${htmlEscape(canonical)}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${jsonLd}</script>`;
    const indexHtml = await (await import("node:fs/promises")).readFile(path.join(distDir, "index.html"), "utf8");
    const html = indexHtml
      .replace(/<title>[^<]*<\/title>/i, "")
      .replace("</head>", `${metadata}</head>`)
      .replace('<div id="root"></div>', `<div id="root">${snapshot.body}</div>`);
    reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return reply.type("text/html; charset=utf-8").send(html);
  } catch (error) {
    request.log.warn({ err: error, path: url.pathname }, "Crawler storefront snapshot unavailable; serving SPA fallback");
  }
}


// Intercept only crawler requests for public storefront paths. Human visitors
// continue through the unchanged SPA fallback.
const crawlerStorefrontRoute = async (request: FastifyRequest, reply: FastifyReply) => {
  const rendered = await renderCrawlerStorefront(request, reply);
  return rendered ?? reply.callNotFound();
};
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
