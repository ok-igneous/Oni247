import { describe, expect, it } from "vitest";
import { renderCrawlerDocument } from "./crawlerDocument";

const shell = '<!doctype html><html><head><title>App</title></head><body><div id="root"></div></body></html>';

describe("renderCrawlerDocument", () => {
  it("injects canonical, social and structured metadata with the crawlable body", () => {
    const html = renderCrawlerDocument({
      indexHtml: shell,
      canonicalUrl: "https://shop.example.com/p/item",
      snapshot: {
        title: "Item — Shop",
        description: "A useful item",
        image: "https://cdn.example.com/item.png",
        body: "<main><h1>Item</h1></main>",
        jsonLd: { "@context": "https://schema.org", "@type": "Product", name: "Item" },
      },
    });
    expect(html).toContain("<title>Item — Shop</title>");
    expect(html).toContain('rel="canonical" href="https://shop.example.com/p/item"');
    expect(html).toContain('property="og:image" content="https://cdn.example.com/item.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain("<main><h1>Item</h1></main>");
    expect(html).not.toContain("<title>App</title>");
  });

  it("escapes metadata attributes and prevents JSON-LD script termination", () => {
    const html = renderCrawlerDocument({
      indexHtml: shell,
      canonicalUrl: 'https://shop.example.com/?q=" onload="alert(1)',
      snapshot: {
        title: '<img src=x onerror="alert(1)">',
        description: '"><script>alert(1)</script>',
        body: "<main>Safe snapshot body</main>",
        jsonLd: { name: "</script><script>alert(1)</script>" },
      },
    });
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain('{"name":"</script>');
    expect(html).toContain('\\u003c/script>');
  });

  it("omits social image metadata when no image exists", () => {
    const html = renderCrawlerDocument({
      indexHtml: shell,
      canonicalUrl: "https://shop.example.com",
      snapshot: { title: "Shop", description: "Welcome", body: "<main>Shop</main>" },
    });
    expect(html).not.toContain('property="og:image"');
    expect(html).not.toContain('name="twitter:image"');
  });

  it("fails closed when the built shell has no expected React root", () => {
    expect(() => renderCrawlerDocument({
      indexHtml: "<html><head></head><body></body></html>",
      canonicalUrl: "https://shop.example.com",
      snapshot: { title: "Shop", description: "Welcome", body: "<main>Shop</main>" },
    })).toThrow("Built HTML is missing the expected React root element");
  });
});
