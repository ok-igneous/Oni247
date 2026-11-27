import { describe, expect, it } from "vitest";
import { getStorefrontBaseUrl } from "./storefrontCanonical";

describe("getStorefrontBaseUrl", () => {
  it("uses the domain root for custom-domain storefront routes", () => {
    expect(getStorefrontBaseUrl("nesmage", "https://shop.example.com", "/"))
      .toBe("https://shop.example.com/");
    expect(getStorefrontBaseUrl("nesmage", "https://shop.example.com", "/p/inverter"))
      .toBe("https://shop.example.com/");
    expect(getStorefrontBaseUrl("nesmage", "https://shop.example.com", "/about"))
      .toBe("https://shop.example.com/");
  });

  it("uses the business slug on platform vanity URLs", () => {
    expect(getStorefrontBaseUrl("nesmage", "https://oni247.org", "/nesmage"))
      .toBe("https://oni247.org/nesmage/");
    expect(getStorefrontBaseUrl("nesmage", "https://oni247.org", "/nesmage/products"))
      .toBe("https://oni247.org/nesmage/");
  });
});
