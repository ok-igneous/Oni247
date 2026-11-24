import Fastify from "fastify";
import superjson from "superjson";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCrawlerStorefrontRenderer } from "./crawlerRenderer";
import { createCrawlerSnapshotLoader } from "./crawlerSnapshotLoader";
import { registerCrawlerStorefrontRoutes } from "./crawlerRoutes";

const shell = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
const business = {
  slug: "nesmage",
  name: "NesMage",
  description: "Technology services",
  logoUrl: null,
  heroImageUrl: null,
  canUseProductLinks: true,
  canUseMultiPage: true,
};
const storefront = {
  business,
  products: [{
    slug: "inverter", name: "Solar inverter", description: "Backup power",
    currency: "NGN", price: 125000, imageUrl: null, available: true,
  }],
  blogPosts: [{
    slug: "welcome", title: "Welcome", excerpt: "Company news",
    content: "<p>Sanitized article content</p>", publishedAt: "2026-01-01",
  }],
  events: [{
    slug: "training", title: "Repair training", description: "Hands-on event",
    startsAt: "2027-01-01", endsAt: null, venue: "Saki", coverImageUrl: null,
  }],
};

function response(value: unknown, status = 200) {
  return new Response(superjson.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const galleryList = {
  galleries: [{
    slug: "repairs", name: "Repair projects", description: "Recent work",
    coverImageUrl: "https://cdn.example/cover.jpg",
  }],
};
const galleryDetail = {
  business: { name: "NesMage" },
  gallery: {
    slug: "repairs", name: "Repair projects", description: "Before and after",
    coverImageUrl: "https://cdn.example/cover.jpg",
    images: [{ imageUrl: "https://cdn.example/photo.jpg", caption: "Completed repair" }],
  },
};

const apps: ReturnType<typeof Fastify>[] = [];

async function makeApp() {
  vi.stubEnv("APP_BASE_URL", "https://oni247.example");
  const app = Fastify({ logger: false });
  apps.push(app);
  const loadSnapshot = createCrawlerSnapshotLoader({
    storefront: async () => response(storefront),
    galleryList: async () => response(galleryList),
    gallery: async () => response(galleryDetail),
  });
  const render = createCrawlerStorefrontRenderer({
    hasProductionBuild: true,
    resolveCustomDomain: async () => null,
    loadSnapshot,
    readIndexHtml: async () => shell,
  });
  registerCrawlerStorefrontRoutes(app, render);
  app.setNotFoundHandler((_request, reply) => reply.type("text/html").send(shell));
  await app.ready();
  return app;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("crawler storefront end-to-end rendering", () => {
  it.each([
    ["/nesmage/p/inverter", "Solar inverter", '"@type":"Product"', "NGN 125000"],
    ["/nesmage/b/welcome", "Welcome", '"@type":"BlogPosting"', "Sanitized article content"],
    ["/nesmage/e/training", "Repair training", '"@type":"Event"', "Saki"],
    ["/nesmage/gallery", "Gallery — NesMage", '"@type":"CollectionPage"', "Repair projects"],
    ["/nesmage/g/repairs", "Repair projects — NesMage", '"@type":"CollectionPage"', "Completed repair"],
  ])("returns crawlable HTML for %s", async (pathname, title, schemaType, bodyContent) => {
    const app = await makeApp();
    const result = await app.inject({
      method: "GET",
      url: pathname,
      headers: { "user-agent": "Googlebot/2.1" },
    });
    expect(result.statusCode).toBe(200);
    expect(result.headers["content-type"]).toContain("text/html");
    expect(result.body).toContain(`<title>${title}</title>`);
    expect(result.body).toContain(schemaType);
    expect(result.body).toContain(bodyContent);
    expect(result.body).not.toContain('<div id="root"></div>');
  });

  it("does not expose a missing product as a successful storefront page", async () => {
    const app = await makeApp();
    const result = await app.inject({
      method: "GET",
      url: "/nesmage/p/not-real",
      headers: { "user-agent": "Googlebot" },
    });
    expect(result.statusCode).toBe(404);
    expect(result.body).toContain('name="robots" content="noindex"');
  });
});
