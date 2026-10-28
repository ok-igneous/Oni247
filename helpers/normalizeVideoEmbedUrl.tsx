/** Convert supported public video links into safe, provider-owned embed URLs. */
export const normalizeVideoEmbedUrl = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      let videoId = "";
   10	      if (host === "youtu.be") {
   11	        videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
   12	      } else if (url.pathname === "/watch") {
   13	        videoId = url.searchParams.get("v") ?? "";
   14	      } else {
   15	        const parts = url.pathname.split("/").filter(Boolean);
   16	        if (["embed", "shorts", "live"].includes(parts[0] ?? "")) videoId = parts[1] ?? "";
   17	      }
   18	      return /^[A-Za-z0-9_-]{11}$/.test(videoId)
   19	        ? `https://www.youtube-nocookie.com/embed/${videoId}`
   20	        : null;
   21	    }
   22	
   23	    const isFacebook = host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch";
   24	    if (isFacebook && url.pathname !== "/plugins/video.php") {
   25	      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false`;
   26	    }
   27	    return null;
   28	  } catch {
   29	    return null;
   30	  }
   31	};
