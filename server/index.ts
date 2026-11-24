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
const app = Fastify({ logger: true, bodyLimit: 60 * 1024 * 1024, trustProxy: true });

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
  if (process.env.NODE_ENV === "production" && request.protocol === "https") {
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
    const response = await endpoint.handle(webRequest);
    reply.code(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    const responseBody = [204, 304].includes(response.status)
      ? null
      : Buffer.from(await response.arrayBuffer());
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
  invokeEndpoint("GET", "sitemap", request, reply, process.env.APP_BASE_URL?.replace(/\/+$/, "")),
);
app.get("/robots.txt", async (request, reply) => {
  const baseUrl = process.env.APP_BASE_URL?.trim() || `${request.protocol}://${request.host}`;
  const sitemap = new URL("/sitemap.xml", baseUrl).toString();
  return reply.type("text/plain; charset=utf-8").send(
    `User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`,
  );
});

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

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const host = process.env.HOST ?? "0.0.0.0";
await app.listen({ port, host });
