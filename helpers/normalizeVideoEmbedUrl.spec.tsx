import { normalizeVideoEmbedUrl } from "./normalizeVideoEmbedUrl";

describe("normalizeVideoEmbedUrl", () => {
  it("normalizes YouTube watch and short links to privacy-enhanced embeds", () => {
    expect(normalizeVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(normalizeVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ"))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
   10	
   11	  it("supports Facebook video links through the official plugin", () => {
   12	    expect(normalizeVideoEmbedUrl("https://www.facebook.com/watch/?v=12345"))
   13	      .toContain("https://www.facebook.com/plugins/video.php?href=");
   14	  });
   15	
   16	  it("rejects unsupported domains, invalid YouTube IDs and unsafe protocols", () => {
   17	    expect(normalizeVideoEmbedUrl("https://example.com/video" )).toBeNull();
   18	    expect(normalizeVideoEmbedUrl("https://youtube.com/watch?v=short" )).toBeNull();
   19	    expect(normalizeVideoEmbedUrl("javascript:alert(1)" )).toBeNull();
   20	  });
   21	});
