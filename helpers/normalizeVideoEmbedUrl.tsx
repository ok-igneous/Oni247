/** Convert supported public video links into safe, provider-owned embed URLs. */
export const normalizeVideoEmbedUrl = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      let videoId = "";
      if (host === "youtu.be") {
        videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
      } else if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") ?? "";
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0] ?? "")) videoId = parts[1] ?? "";
      }
      return /^[A-Za-z0-9_-]{11}$/.test(videoId)
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : null;
    }

    const isFacebook = host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch";
    if (isFacebook && url.pathname !== "/plugins/video.php") {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false`;
    }
    return null;
  } catch {
    return null;
  }
};
