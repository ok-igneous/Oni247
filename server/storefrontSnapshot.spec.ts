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
