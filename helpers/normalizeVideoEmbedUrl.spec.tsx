import { normalizeVideoEmbedUrl } from "./normalizeVideoEmbedUrl";

describe("normalizeVideoEmbedUrl", () => {
  it("normalizes YouTube watch and short links to privacy-enhanced embeds", () => {
    expect(normalizeVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(normalizeVideoEmbedUrl("https://youtu.be/dQw4w9WgXcQ"))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("supports Facebook video links through the official plugin", () => {
    expect(normalizeVideoEmbedUrl("https://www.facebook.com/watch/?v=12345"))
      .toContain("https://www.facebook.com/plugins/video.php?href=");
  });

  it("rejects unsupported domains, invalid YouTube IDs and unsafe protocols", () => {
    expect(normalizeVideoEmbedUrl("https://example.com/video" )).toBeNull();
    expect(normalizeVideoEmbedUrl("https://youtube.com/watch?v=short" )).toBeNull();
    expect(normalizeVideoEmbedUrl("javascript:alert(1)" )).toBeNull();
  });
});
