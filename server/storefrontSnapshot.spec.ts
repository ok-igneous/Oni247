import { describe, expect, it } from "vitest";
import { storefrontSnapshot } from "./storefrontSnapshot";

const business = {
  slug: "nesmage",
  name: "NesMage <Tech>",
  description: "Repair and technology services",
  logoUrl: "https://cdn.example.com/logo.png",
  heroImageUrl: null,
  heroHeadline: "Built for business",
  heroSubtext: "Technology that works",
  canUseProductLinks: true,
  canUseMultiPage: true,
};
const product = {
  slug: "solar-inverter",
  name: "Solar Inverter",
  description: "Reliable <backup> power",
  currency: "NGN",
  price: 125000,
  imageUrl: "https://cdn.example.com/inverter.png",
  available: true,
};

describe("storefrontSnapshot", () => {
  it("renders an escaped storefront homepage with crawlable product links", () => {
    const result = storefrontSnapshot(
      { business, products: [product] },
      "/nesmage",
      "https://oni247.org",
    );
    expect(result.title).toBe("NesMage <Tech> — Oni247");
    expect(result.body).toContain("NesMage &lt;Tech&gt;");
    expect(result.body).toContain("Solar Inverter");
    expect(result.body).toContain("/nesmage/p/solar-inverter");
    expect(result.jsonLd).toMatchObject({ "@type": "Store", name: business.name });
  });

  it("does not expose paid product-detail links when the plan lacks that feature", () => {
    const result = storefrontSnapshot(
      { business: { ...business, canUseProductLinks: false }, products: [product] },
      "/nesmage",
      "https://oni247.org",
    );
    expect(result.body).toContain("<strong>Solar Inverter</strong>");
    expect(result.body).not.toContain("/nesmage/p/solar-inverter");
  });
  it("renders product detail metadata and price", () => {
    const result = storefrontSnapshot(
      { business, products: [product] },
      "/nesmage/p/solar-inverter",
      "https://oni247.org",
    );
    expect(result.title).toBe("Solar Inverter — NesMage <Tech>");
    expect(result.description).toBe("Reliable <backup> power");
    expect(result.body).toContain("Reliable &lt;backup&gt; power");
    expect(result.body).toContain("NGN 125000");
    expect(result.jsonLd).toMatchObject({
      "@type": "Product",
      name: "Solar Inverter",
      offers: { price: 125000, priceCurrency: "NGN" },
    });
  });

  it("renders multi-page sections with their own title and content", () => {
    const result = storefrontSnapshot(
      { business, services: [{ name: "Phone repair", description: "Screen replacement" }] },
      "/nesmage/services",
      "https://oni247.org",
    );
    expect(result.title).toBe("Services — NesMage <Tech>");
    expect(result.body).toContain("<h1>Services</h1>");
    expect(result.body).toContain("Phone repair");
    expect(result.jsonLd).toMatchObject({ "@type": "WebPage", name: "Services — NesMage <Tech>" });
  });

  it("uses the custom-domain root when generating storefront links", () => {
    const result = storefrontSnapshot(
      { business, products: [product] },
      "/",
      "https://shop.example.com",
      true,
    );
    expect(result.body).toContain('href="https://shop.example.com/p/solar-inverter"');
    expect(result.jsonLd).toMatchObject({ url: "https://shop.example.com" });
  });

  it("sanitizes blog HTML before including it in server-rendered storefront output", () => {
    const result = storefrontSnapshot(
      {
        business,
        blogPosts: [{
          slug: "safe-formatting",
          title: "News",
          excerpt: "Latest update",
          content: '<h2>Safe heading</h2><p onclick="alert(1)">Safe text</p><script>alert(document.cookie)</script><a href="javascript:alert(2)">unsafe link</a>',
        }],
      },
      "/nesmage/b/safe-formatting",
      "https://oni247.org",
    );

    expect(result.body).toContain("<h2>Safe heading</h2>");
    expect(result.body).toContain("<p>Safe text</p>");
    expect(result.body).not.toContain("<script");
    expect(result.body).not.toContain("onclick");
    expect(result.body).not.toContain("javascript:");
    expect(result.body).not.toContain("document.cookie");
  });

  it("rejects unavailable or plan-restricted product pages", () => {
    expect(() => storefrontSnapshot(
      { business: { ...business, canUseProductLinks: false }, products: [product] },
      "/nesmage/p/solar-inverter",
      "https://oni247.org",
    )).toThrow("Public product not found");
    expect(() => storefrontSnapshot(
      { business, products: [] },
      "/nesmage/p/missing",
      "https://oni247.org",
    )).toThrow("Public product not found");
  });

  it("rejects multi-page content when the plan does not include it", () => {
    expect(() => storefrontSnapshot(
      { business: { ...business, canUseMultiPage: false } },
      "/nesmage/about",
      "https://oni247.org",
    )).toThrow("Public page not found");
  });
});
