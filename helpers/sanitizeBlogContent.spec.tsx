import { sanitizeBlogContent } from "./sanitizeBlogContent";

describe("sanitizeBlogContent", () => {
  it("keeps the supported formatting tags", () => {
    expect(sanitizeBlogContent("<h2>News</h2><p><strong>Hello</strong></p>"))
      .toBe("<h2>News</h2><p><strong>Hello</strong></p>");
  });

  it("removes executable markup and unsafe attributes", () => {
   10	    const result = sanitizeBlogContent(
   11	      '<p onclick="alert(1)">Safe text</p><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">bad link</a>',
   12	    );
   13	    expect(result).toContain("<p>Safe text</p>");
   14	    expect(result).not.toContain("<script");
   15	    expect(result).not.toContain("onclick");
   16	    expect(result).not.toContain("onerror");
   17	    expect(result).not.toContain("javascript:");
   18	  });
   19	
   20	  it("only preserves safe color styles on spans", () => {
   21	    expect(sanitizeBlogContent('<span style="color:#123456;background:url(javascript:alert(1))">Text</span>'))
   22	      .toBe('<span style="color:#123456">Text</span>');
   23	  });
   24	});
