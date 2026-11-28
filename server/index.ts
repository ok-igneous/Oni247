import "dotenv/config";

process.on("uncaughtExceptionMonitor", (error, origin) => {
  console.error("[oni247] Uncaught process exception", { origin, error });
});
console.info("[oni247] Startup: initializing API server");
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { sql } from "kysely";
import { isPlatformHostname, normalizeDomainHost } from "./storefrontPrerender";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";


const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const endpointsRoot = path.join(projectRoot, "endpoints");
const apiHost = process.env.HOST ?? "127.0.0.1";
// A loopback-only API is reachable only by the local Next.js proxy, so trusting
// one hop is safe by default. Any non-loopback bind must configure proxy trust
// explicitly and remain on a private network.
const loopbackHost = apiHost === "127.0.0.1" || apiHost === "localhost" || apiHost === "::1";
const trustProxySetting = process.env.TRUST_PROXY?.trim().toLowerCase();
const trustProxy = trustProxySetting === "true"
  ? true
  : trustProxySetting === "false"
    ? false
    : trustProxySetting && /^\d+$/.test(trustProxySetting)
      ? (_address: string, hop: number) => hop < Number(trustProxySetting)
      : loopbackHost
        ? (_address: string, hop: number) => hop < 1
        : false;

const app = Fastify({
  logger: {
    serializers: {
      req(request) {
        return {
          method: request.method,
          // Query strings may contain payment references or secrets.
          url: request.url.split("?")[0],
          hostname: request.hostname,
        };
      },
    },
  },
  bodyLimit: 60 * 1024 * 1024,
  trustProxy,
});

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

console.info("[oni247] Startup: discovering endpoint handlers", { endpointsRoot });
await discoverEndpoints(endpointsRoot);
console.info("[oni247] Startup: endpoint discovery complete", { endpointCount: endpointFiles.size });

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
  // Reject browser-originated cross-site mutations. Requests without Origin
  // remain available for server-to-server webhooks and non-browser clients.
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const originHeader = request.headers.origin;
    if (originHeader) {
      try {
        const { isSameOriginMutation } = await import("./requestOrigin");
        if (!isSameOriginMutation(
          originHeader,
          request.protocol,
          request.headers.host,
          request.headers["x-forwarded-host"],
          request.headers["x-forwarded-proto"],
        )) {
          request.log.warn({
            route,
            origin: originHeader,
            host: request.headers.host,
            forwardedHost: request.headers["x-forwarded-host"],
            protocol: request.protocol,
            forwardedProto: request.headers["x-forwarded-proto"],
          }, "Rejected mutation with mismatched browser origin");
          return reply.code(403).send({
            error: "We couldn't verify this request. Please refresh the page and try again. If the problem continues, open Oni247 in a new tab.",
            code: "ORIGIN_CHECK_FAILED",
          });
        }
      } catch {
        return reply.code(403).send({ error: "Invalid request origin" });
      }
    }
  }

  const file = endpointFiles.get(`${method} ${route}`);
  if (!file) return reply.code(404).send({ error: "API endpoint not found" });

  const ratePolicy: Record<string, { limit: number; windowSeconds: number }> = {
    "auth/login_with_password": { limit: 20, windowSeconds: 15 * 60 },
    "auth/register_with_password": { limit: 5, windowSeconds: 15 * 60 },
    "auth/forgot_password": { limit: 5, windowSeconds: 15 * 60 },
    "auth/send_verification": { limit: 5, windowSeconds: 15 * 60 },
    "auth/reset_password": { limit: 10, windowSeconds: 15 * 60 },
    "auth/verify_email": { limit: 10, windowSeconds: 15 * 60 },
    "storefront/order": { limit: 10, windowSeconds: 10 * 60 },
    "storefront/enquiry": { limit: 10, windowSeconds: 10 * 60 },
    "storefront/orderPay": { limit: 8, windowSeconds: 10 * 60 },
    "pay/start": { limit: 8, windowSeconds: 10 * 60 },
  };
  const policy = method === "POST" ? ratePolicy[route] : undefined;
  if (policy) {
    try {
      const { checkIpRateLimit } = await import("../helpers/ipRateLimit");
      const result = await checkIpRateLimit(request.ip, route, policy.limit, policy.windowSeconds);
      if (!result.allowed) {
        const retryAt = Date.now() + result.retryAfterSeconds * 1000;
        reply.header("Retry-After", String(result.retryAfterSeconds));
        const retryMinutes = Math.floor(result.retryAfterSeconds / 60);
        const retrySeconds = result.retryAfterSeconds % 60;
        const retryLabel = retryMinutes > 0
          ? `${retryMinutes}m ${retrySeconds}s`
          : `${retrySeconds}s`;
        const errorMessage =
          `Too many login requests: ${result.requestCount}/${result.requestLimit} used. ` +
          `${result.requestsRemaining} requests remaining in this window. Try again in ${retryLabel}.`;
        return reply.code(429).send({
          error: errorMessage,
          code: "IP_RATE_LIMITED",
          requestCount: result.requestCount,
          requestLimit: result.requestLimit,
          requestsRemaining: result.requestsRemaining,
          retryAfterSeconds: result.retryAfterSeconds,
          retryAt,
        });
      }
    } catch (error) {
      request.log.error({ err: error, route }, "Request rate limiter unavailable");
      return reply.code(503).send({ error: "This service is temporarily unavailable. Please try again shortly." });
    }
  }

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
    const requestBody = body === undefined
      ? undefined
      : new Uint8Array(Buffer.isBuffer(body) ? body : Buffer.from(String(body)));
    const webRequest = new Request(new URL(request.url, originOverride ?? `${request.protocol}://${request.host}`), {
      method,
      headers,
      ...(requestBody !== undefined && !["GET", "HEAD"].includes(method)
        ? { body: requestBody }
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
      // PostgreSQL BIGINT IDs are returned as strings by postgres.js by default.
      // Convert the verified session identity before entering the request DB context.
      const userId = Number(auth.user.id);
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new Error("Authenticated session contains an invalid user ID.");
      }
      authenticatedUserId = userId;
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
  let route: string;
  try {
    route = decodeURIComponent(pathname.replace(/^\/_api\/?/, "").replace(/\/$/, ""));
  } catch {
    return reply.code(400).send({ error: "Malformed API path" });
  }
  if (route.includes("\\") || route.includes("\0") || route.split("/").some((part) => part === "." || part === "..")) {
    return reply.code(400).send({ error: "Invalid API path" });
  }
  return invokeEndpoint(request.method.toUpperCase(), route, request, reply);
});

// SEO endpoints are proxied with the original request host so custom domains
// receive their own canonical sitemap and robots Sitemap URL.
app.get("/sitemap.xml", async (request, reply) =>
  invokeEndpoint("GET", "sitemap", request, reply),
);
app.get("/robots.txt", async (request, reply) => {
  const requestHost = normalizeDomainHost(request.host);
  const platformRoot = process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || "https://oni247.org";
  const renderHost = normalizeDomainHost(process.env.RENDER_EXTERNAL_HOSTNAME);
  const isPlatformHost = isPlatformHostname(requestHost ?? "", platformRoot)
    || Boolean(requestHost && renderHost && requestHost === renderHost);
  const baseUrl = isPlatformHost
    ? (process.env.APP_BASE_URL?.trim() || `${request.protocol}://${request.host}`)
    : `${request.protocol}://${request.host}`;
  const sitemap = new URL("/sitemap.xml", baseUrl).toString();
  return reply.type("text/plain; charset=utf-8").send(
    `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /login\nDisallow: /register\nDisallow: /track\nDisallow: /_api/\nSitemap: ${sitemap}\n`,
  );
});

// Next.js owns all public web rendering. Fastify is deliberately API-only.
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith("/_api/")) {
    return reply.code(404).send({ error: "API endpoint not found" });
  }
  return reply.code(404).send({ error: "Not found" });
});

app.addHook("onClose", async () => {
  if (process.env.DATABASE_URL) {
    const { closeDatabase } = await import("../helpers/db");
    await closeDatabase();
  }
});

const port = Number.parseInt(process.env.API_PORT ?? "3001", 10);
const host = apiHost;
console.info("[oni247] Startup: binding private API listener", { host, port });
await app.listen({ port, host });
console.info("[oni247] Startup: private API listener ready", { host, port });

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
