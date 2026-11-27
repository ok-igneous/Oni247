import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCrawlerStorefrontRenderer, type CrawlerSnapshotRequest } from "./crawlerRenderer";
import { registerCrawlerStorefrontRoutes } from "./crawlerRoutes";

const shell = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
const apps: ReturnType<typeof Fastify>[] = [];

async function makeApp(overrides: Partial<Parameters<typeof createCrawlerStorefrontRenderer>[0]> = {}) {
  const app = Fastify({ logger: false });
  apps.push(app);
  const renderer = createCrawlerStorefrontRenderer({
    hasProductionBuild: true,
    resolveCustomDomain: async () => null,
    loadSnapshot: async ({ slug, pathname, customDomain }) => ({
      title: `${slug} storefront`,
      description: `Rendered ${pathname}`,
      body: `<main><h1>${slug}</h1><p>${customDomain ? "custom" : "platform"}</p></main>`,
    }),
    readIndexHtml: async () => shell,
    ...overrides,
  });
  registerCrawlerStorefrontRoutes(app, renderer);
  app.setNotFoundHandler((_request, reply) =>
    reply.type("text/html; charset=utf-8").send('<!doctype html><div id="root"></div>'),
  );
  await app.ready();
  return app;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("production crawler renderer factory", () => {
  it("renders a real vanity storefront response with canonical and body content", async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: "GET", url: "/nesmage", headers: { "user-agent": "Googlebot/2.1" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers.vary).toBe("User-Agent");
    expect(response.headers["cache-control"]).toContain("max-age=60");
    expect(response.body).toContain('<h1>nesmage</h1>');
    expect(response.body).toContain('rel="canonical" href="http://localhost/nesmage"');
  });

  it("resolves platform business storefronts at oni247.org/{slug}", async () => {
    vi.stubEnv("APP_BASE_URL", "https://oni247.org");
    const loadSnapshot = vi.fn(async ({ slug, pathname, customDomain }: CrawlerSnapshotRequest) => ({
      title: slug,
      description: "Platform vanity URL",
      body: `<main>${slug}:${pathname}:${customDomain ? "custom" : "platform"}</main>`,
    }));
    const app = await makeApp({ loadSnapshot });
    const response = await app.inject({
      method: "GET", url: "/nesmage", headers: { host: "oni247.org", "user-agent": "Googlebot" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("<main>nesmage:/nesmage:platform</main>");
    expect(loadSnapshot).toHaveBeenCalledWith({
      slug: "nesmage", pathname: "/nesmage", origin: "http://oni247.org", customDomain: false,
    });
  });

  it("resolves verified custom-domain routes and passes their identity to snapshot loading", async () => {
    vi.stubEnv("APP_BASE_URL", "https://platform.example.com");
    const loadSnapshot = vi.fn(async ({ slug, customDomain }: CrawlerSnapshotRequest) => ({
      title: slug,
      description: "Custom domain",
      body: `<main>${customDomain ? "custom" : "platform"}</main>`,
    }));
    const app = await makeApp({
      resolveCustomDomain: async (host) => host === "shop.example.com" ? "nesmage" : null,
      loadSnapshot,
    });
    const response = await app.inject({
      method: "GET", url: "/", headers: { host: "shop.example.com", "user-agent": "Googlebot" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("<main>custom</main>");
    expect(loadSnapshot).toHaveBeenCalledWith({
      slug: "nesmage", pathname: "/", origin: "http://shop.example.com", customDomain: true,
    });
  });

  it("does not expose business subdomains as platform storefront URLs", async () => {
    vi.stubEnv("PLATFORM_ROOT_DOMAIN", "oni247.org");
    const resolveCustomDomain = vi.fn(async () => null);
    const app = await makeApp({ resolveCustomDomain });
    const response = await app.inject({
      method: "GET", url: "/", headers: { host: "nesmage.oni247.org", "user-agent": "Googlebot" },
    });
    expect(response.body).toContain('<div id="root"></div>');
    expect(resolveCustomDomain).toHaveBeenCalledWith("nesmage.oni247.org");
  });

  it("leaves ordinary visitors and reserved paths on the SPA fallback", async () => {
    const app = await makeApp();
    const visitor = await app.inject({ method: "GET", url: "/nesmage", headers: { "user-agent": "Mozilla/5.0" } });
    const reserved = await app.inject({ method: "GET", url: "/dashboard", headers: { "user-agent": "Googlebot" } });
    expect(visitor.body).toContain('<div id="root"></div>');
    expect(reserved.body).toContain('<div id="root"></div>');
  });

  it("returns a noindex 404 for missing public content", async () => {
    const app = await makeApp({
      loadSnapshot: async () => { throw new Error("Public page not found"); },
    });
    const response = await app.inject({
      method: "GET", url: "/nesmage/about", headers: { "user-agent": "Googlebot" },
    });
    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('name="robots" content="noindex"');
  });

  it("returns retryable 503 when public data cannot be loaded", async () => {
    const app = await makeApp({
      loadSnapshot: async () => { throw new Error("database unavailable"); },
    });
    const response = await app.inject({
      method: "GET", url: "/nesmage", headers: { "user-agent": "Googlebot" },
    });
    expect(response.statusCode).toBe(503);
    expect(response.headers["retry-after"]).toBe("30");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("does not render when the production build is absent", async () => {
    const readIndexHtml = vi.fn(async () => shell);
    const app = await makeApp({ hasProductionBuild: false, readIndexHtml });
    const response = await app.inject({
      method: "GET", url: "/nesmage", headers: { "user-agent": "Googlebot" },
    });
    expect(response.body).toContain('<div id="root"></div>');
    expect(readIndexHtml).not.toHaveBeenCalled();
  });
});
