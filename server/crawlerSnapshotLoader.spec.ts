import { describe, expect, it, vi } from "vitest";
import superjson from "superjson";
import { createCrawlerSnapshotLoader } from "./crawlerSnapshotLoader";

const business = {
  slug: "nesmage", name: "NesMage", description: "Technology services",
  canUseProductLinks: true, canUseMultiPage: true,
};
const storefrontData = {
  business,
  products: [{ slug: "inverter", name: "Solar inverter", description: "Backup power", currency: "NGN", price: 125000, available: true }],
  blogPosts: [{ slug: "welcome", title: "Welcome", excerpt: "News", content: "<p>Sanitized article</p>", publishedAt: "2026-01-01" }],
  events: [{ slug: "training", title: "Repair training", description: "Hands-on event", startsAt: "2027-01-01", venue: "Saki" }],
};

function endpoint(value: unknown, status = 200) {
  return vi.fn(async () => new Response(superjson.stringify(value), {
    status, headers: { "Content-Type": "application/json" },
  }));
}

describe("createCrawlerSnapshotLoader", () => {
  it.each([
    ["/nesmage/p/inverter", "Solar inverter", "Product"],
    ["/nesmage/b/welcome", "Welcome", "BlogPosting"],
    ["/nesmage/e/training", "Repair training", "Event"],
  ])("loads and renders detail route %s", async (pathname, expectedTitle, type) => {
    const storefront = endpoint(storefrontData);
    const load = createCrawlerSnapshotLoader({
      storefront, galleryList: endpoint({ galleries: [] }), gallery: endpoint({}),
    });
    const snapshot = await load({
      slug: "nesmage", pathname, origin: "https://oni247.example", customDomain: false,
    });
    expect(snapshot.title).toContain(expectedTitle);
    expect(snapshot.body).toContain(expectedTitle);
    expect(snapshot.jsonLd).toMatchObject({ "@type": type });
    expect(storefront).toHaveBeenCalledTimes(1);
  });

  it("loads gallery collection data and generates correct vanity links", async () => {
    const galleryList = endpoint({ galleries: [{
      slug: "repairs", name: "Repair projects", description: "Recent work",
      coverImageUrl: "https://cdn.example/cover.jpg",
    }] });
    const load = createCrawlerSnapshotLoader({
      storefront: endpoint(storefrontData), galleryList, gallery: endpoint({}),
    });
    const snapshot = await load({
      slug: "nesmage", pathname: "/nesmage/gallery", origin: "https://oni247.example", customDomain: false,
    });
    expect(snapshot.body).toContain("/nesmage/g/repairs");
    expect(snapshot.body).toContain("Repair projects");
    expect(galleryList).toHaveBeenCalledTimes(1);
  });

  it("loads gallery detail images and custom-domain relative links", async () => {
    const gallery = endpoint({
      business: { name: "NesMage" },
      gallery: {
        name: "Repair projects", slug: "repairs", description: "Before and after",
        images: [{ imageUrl: "https://cdn.example/photo.jpg", caption: "Completed repair" }],
      },
    });
    const load = createCrawlerSnapshotLoader({
      storefront: endpoint(storefrontData), galleryList: endpoint({ galleries: [] }), gallery,
    });
    const snapshot = await load({
      slug: "nesmage", pathname: "/g/repairs", origin: "https://shop.example.com", customDomain: true,
    });
    expect(snapshot.body).toContain('href="/gallery"');
    expect(snapshot.body).toContain("https://cdn.example/photo.jpg");
    expect(snapshot.body).toContain("Completed repair");
    expect(snapshot.jsonLd).toMatchObject({ "@type": "CollectionPage" });
  });

  it("maps a missing public endpoint resource to the renderer's 404 contract", async () => {
    const load = createCrawlerSnapshotLoader({
      storefront: endpoint({ error: "missing" }, 404),
      galleryList: endpoint({ galleries: [] }), gallery: endpoint({}),
    });
    await expect(load({
      slug: "missing", pathname: "/missing", origin: "https://oni247.example", customDomain: false,
    })).rejects.toThrow("Public storefront not found");
  });

  it("does not turn transient endpoint failures into false 404s", async () => {
    const load = createCrawlerSnapshotLoader({
      storefront: endpoint({ error: "temporary" }, 500),
      galleryList: endpoint({ galleries: [] }), gallery: endpoint({}),
    });
    await expect(load({
      slug: "nesmage", pathname: "/nesmage", origin: "https://oni247.example", customDomain: false,
    })).rejects.toThrow("Public endpoint returned 500");
  });
});
