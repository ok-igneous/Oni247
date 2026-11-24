import "dotenv/config";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { readdir } from "node:fs/promises";
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
      const routePath = relative.replace(methodSuffix, "");
      endpointFiles.set(`${match[1]} ${routePath}`, fullPath);
    }
  }
}

await discoverEndpoints(endpointsRoot);

app.removeAllContentTypeParsers();
app.addContentTypeParser("*", { parseAs: "buffer" }, (_request, body, done) => done(null, body));
app.get("/healthz", async () => ({ ok: true, service: "oni247-api", endpoints: endpointFiles.size }));
app.all("/_api/*", async (request, reply) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const route = decodeURIComponent(pathname.replace(/^\/_api\/?/, "")).replace(/\/$/, "");
  const file = endpointFiles.get(`${request.method.toUpperCase()} ${route}`);
  if (!file) return reply.code(404).send({ error: "API endpoint not found" });

  try {
    const endpoint = await import(pathToFileURL(file).href) as EndpointModule;
    if (typeof endpoint.handle !== "function") throw new Error(`Endpoint ${route} does not export handle()`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) headers.set(key, value.join(", "));
      else if (value !== undefined) headers.set(key, value);
    }
    const body = request.body;
    const webRequest = new Request(new URL(request.url, `http://${request.headers.host ?? "localhost"}`), {
      method: request.method,
      headers,
      ...(body !== undefined && !["GET", "HEAD"].includes(request.method) ? { body: Buffer.isBuffer(body) ? body : Buffer.from(String(body)) } : {}),
    });
    const response = await endpoint.handle(webRequest);
    reply.code(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    const responseBody = [204, 304].includes(response.status) ? null : Buffer.from(await response.arrayBuffer());
    return reply.send(responseBody);
  } catch (error) {
    request.log.error({ err: error, route }, "API endpoint failed");
    return reply.code(500).send({ error: "Internal server error" });
  }
});

const distDir = path.join(projectRoot, "dist");
await app.register(fastifyStatic, { root: distDir, prefix: "/", wildcard: false, decorateReply: true });
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith("/_api/")) return reply.code(404).send({ error: "Not found" });
  if (request.method !== "GET" && request.method !== "HEAD") return reply.code(404).send({ error: "Not found" });
  return reply.type("text/html; charset=utf-8").sendFile("index.html");
});

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const host = process.env.HOST ?? "0.0.0.0";
await app.listen({ port, host });
