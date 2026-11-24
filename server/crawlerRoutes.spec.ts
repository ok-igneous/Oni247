import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerCrawlerStorefrontRoutes } from "./crawlerRoutes";

const apps: ReturnType<typeof Fastify>[] = [];

async function makeApp() {
  const app = Fastify({ logger: false });
  apps.push(app);
  registerCrawlerStorefrontRoutes(app, async (request, reply) => {
    if (!/googlebot|twitterbot/i.test(String(request.headers["user-agent"] ?? ""))) return;
    if (!/^\/(?:nesmage(?:\/|$)|p\/[^/]+$)/.test(request.url.split("?")[0])) return;
    return reply.code(200).type("text/html; charset=utf-8").send(
      '<!doctype html><title>NesMage</title><main><h1>NesMage</h1></main>',
    );
  });
  app.setNotFoundHandler((_request, reply) =>
    reply.type("text/html; charset=utf-8").send("<!doctype html><div id=\"root\"></div>"),
  );
  await app.ready();
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("crawler storefront HTTP routes", () => {
  it("serves the crawler-rendered vanity homepage through Fastify inject", async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: "GET",
      url: "/nesmage",
      headers: { "user-agent": "Googlebot/2.1" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers.vary).toBe("User-Agent");
    expect(response.body).toContain("<h1>NesMage</h1>");
  });

  it("routes nested storefront URLs to the same rendering handler", async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: "GET",
      url: "/nesmage/p/solar-inverter",
      headers: { "user-agent": "Twitterbot" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("NesMage");
  });

  it("preserves the SPA fallback for ordinary visitors", async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: "GET",
      url: "/nesmage",
      headers: { "user-agent": "Mozilla/5.0 Chrome/130 Safari/537.36" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers.vary).toBe("User-Agent");
    expect(response.body).toContain('<div id="root"></div>');
    expect(response.body).not.toContain("<h1>NesMage</h1>");
  });

  it("does not prerender unsupported routes even for crawlers", async () => {
    const app = await makeApp();
    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { "user-agent": "Googlebot/2.1" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<div id="root"></div>');
    expect(response.body).not.toContain("<h1>NesMage</h1>");
  });
});
