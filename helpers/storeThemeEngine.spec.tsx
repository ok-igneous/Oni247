import { DEFAULT_STORE_THEME, storeThemeEngine } from "./storeThemeEngine";

describe("storeThemeEngine", () => {
  it("provides consistent default storefront design tokens", () => {
    const result = storeThemeEngine("clean", {});
    expect(result.style["--primary"]).toBe(DEFAULT_STORE_THEME.primaryColor);
    expect(result.style["--font-family-base"]).toBe(DEFAULT_STORE_THEME.fontFamily);
    expect(result.style["--font-family-display"]).toBe(DEFAULT_STORE_THEME.displayFontFamily);
    expect(result.style.fontSize).toBe(DEFAULT_STORE_THEME.bodyFontSize);
    expect(result.headerBrand).toBe("logo_name");
  });

  it("applies custom typography and colours to the shared storefront tokens", () => {
    const result = storeThemeEngine("clean", {
      primaryColor: "#075985",
      fontFamily: "Georgia, serif",
      displayFontFamily: "Georgia, serif",
      bodyFontSize: "18px",
      headingWeight: "900",
    });
    expect(result.style["--primary"]).toBe("#075985");
    expect(result.style["--font-family-base"]).toBe("Georgia, serif");
    expect(result.style["--font-family-display"]).toBe("Georgia, serif");
    expect(result.style["--store-heading-weight"]).toBe("900");
    expect(result.style.fontSize).toBe("18px");
  });

  it("keeps background images scroll-safe on mobile browsers", () => {
    const result = storeThemeEngine("clean", { backgroundImageUrl: "https://example.com/store.jpg", backgroundOverlay: 35 });
    expect(result.style.backgroundAttachment).toBe("scroll");
    expect(result.style.backgroundImage).toContain("rgba(0,0,0,0.35)");
  });
});
