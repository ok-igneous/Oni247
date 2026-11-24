import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  injectCrawlerHtml,
  isCrawlerUserAgent,
  isPublicStorefrontPath,
  isPublicCustomDomainPath,
  normalizeDomainHost,\n  resolvePlatformSubdomainSlug,
} from "./storefrontPrerender";

describe("crawler storefront helpers", () => {
  it("recognizes search and social preview crawlers without matching ordinary browsers", () => {
    expect(isCrawlerUserAgent("Googlebot/2.1")).toBe(true);
    expect(isCrawlerUserAgent("Twitterbot")).toBe(true);
    expect(isCrawlerUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isCrawlerUserAgent("Mozilla/5.0 Chrome/130 Safari/537.36")).toBe(false);
    expect(isCrawlerUserAgent("")).toBe(false);
  });

  it("escapes HTML text and attribute values", () => {
    expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;");
    expect(escapeHtml(null)).toBe("");
  });

  it("allows vanity storefront routes and known public detail routes", () => {
    for (const path of [
      "/nesmage",
      "/nesmage/products",
      "/nesmage/p/solar-inverter",
      "/nesmage/b/company-news",
      "/nesmage/e/open-day",
      "/nesmage/g/project-gallery",
      "/nesmage/contact",
    ]) expect(isPublicStorefrontPath(path), path).toBe(true);
  });

  it("rejects private, static, API and unsupported paths", () => {
    for (const path of [
      "/dashboard",
      "/admin/businesses",
      "/login",
      "/_api/storefront",
      "/assets/app.js",
      "/src/main.tsx",
      "/robots.txt",
      "/sitemap.xml",
      "/nesmage/checkout",
      "/nesmage/track",
      "/nesmage/book/service-id",
      "/nesmage/p",
      "/nesmage/p/item/extra",
      "/nesmage/unknown-section",
    ]) expect(isPublicStorefrontPath(path), path).toBe(false);
  });

  it("allows only public vanity routes on custom-domain roots", () => {
    for (const path of ["/", "/products", "/p/solar-inverter", "/b/news", "/e/open-day", "/g/projects", "/contact"]) {
      expect(isPublicCustomDomainPath(path), path).toBe(true);
    }
    for (const path of ["/dashboard", "/_api/storefront", "/assets/app.js", "/checkout", "/track", "/p", "/p/item/extra"]) {
      expect(isPublicCustomDomainPath(path), path).toBe(false);
    }
  });

  it("normalizes verified custom-domain hostnames safely", () => {
    expect(normalizeDomainHost("https://Shop.Example.com/path")).toBe("shop.example.com");
    expect(normalizeDomainHost("shop.example.com")).toBe("shop.example.com");
    expect(normalizeDomainHost("http://shop.example.com")).toBeNull();
    expect(normalizeDomainHost("https://user:pass@shop.example.com")).toBeNull();
    expect(normalizeDomainHost("not a domain")).toBeNull();
  });

  it("resolves only a single business subdomain under the configured platform root", () => {
    expect(resolvePlatformSubdomainSlug("nesmage.oni247.com", "https://oni247.com")).toBe("nesmage");
    expect(resolvePlatformSubdomainSlug("nesmage.oni247.com", "https://www.oni247.com")).toBe("nesmage");
    expect(resolvePlatformSubdomainSlug("NESMAGE.ONI247.COM", "oni247.com")).toBe("nesmage");
    expect(resolvePlatformSubdomainSlug("oni247.com", "oni247.com")).toBeNull();
    expect(resolvePlatformSubdomainSlug("www.oni247.com", "oni247.com")).toBeNull();
    expect(resolvePlatformSubdomainSlug("a.b.oni247.com", "oni247.com")).toBeNull();
    expect(resolvePlatformSubdomainSlug("admin.oni247.com", "oni247.com")).toBeNull();
    expect(resolvePlatformSubdomainSlug("other.com", "oni247.com")).toBeNull();
  });

  it("injects metadata and crawlable content into the expected SPA shell", () => {
    const html = injectCrawlerHtml(
      '<!doctype html><html><head><title>Oni247</title></head><body><div id="root">  </div></body></html>',
      '<meta name="description" content="Shop">',
      "<main><h1>NesMage</h1></main>",
    );
    expect(html).not.toContain("<title>Oni247</title>");
    expect(html).toContain('<meta name="description" content="Shop">');
    expect(html).toContain("<main><h1>NesMage</h1></main>");
  });

  it("fails clearly if the build output does not contain the React root", () => {
    expect(() => injectCrawlerHtml("<html><head></head><body></body></html>", "", ""))
      .toThrow("missing the expected React root");
  });
});
