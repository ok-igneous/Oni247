import { describe, it, expect } from "vitest";
import { sanitizeBlogContent } from "./sanitizeBlogContent";

describe("sanitizeBlogContent", () => {
  it("keeps the supported formatting tags", () => {
    expect(sanitizeBlogContent("<h2>News</h2><p><strong>Hello</strong></p>"))
      .toBe("<h2>News</h2><p><strong>Hello</strong></p>");
  });

  it("removes executable markup and unsafe attributes", () => {
    const result = sanitizeBlogContent(
      '<p onclick="alert(1)">Safe text</p><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">bad link</a>',
    );
    expect(result).toContain("<p>Safe text</p>");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("javascript:");
  });

  it("only preserves safe color styles on spans", () => {
    expect(sanitizeBlogContent('<span style="color:#123456;background:url(javascript:alert(1))">Text</span>'))
      .toBe('<span style="color:#123456">Text</span>');
  });

  it("keeps YouTube embeds and drops any other iframe", () => {
    const good = sanitizeBlogContent(
      '<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"></iframe></div>',
    );
    expect(good).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    const bad = sanitizeBlogContent('<iframe src="https://evil.example/embed/x"></iframe>');
    expect(bad).not.toContain("iframe");
  });

  it("keeps uploaded images but not inline script handlers or data URLs", () => {
    expect(sanitizeBlogContent('<img src="/_cdn/a.jpg" alt="A">')).toContain('src="/_cdn/a.jpg"');
    expect(sanitizeBlogContent('<img src="data:text/html;base64,AAAA">')).not.toContain("data:");
  });
});
