export type ShareKind = "home" | "page" | "product" | "blog" | "event" | "gallery";

/** Link to share. Social apps read the title, picture and description from this address. */
export const shareLink = (slug: string, kind: ShareKind = "home", id = "") => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({ slug, kind });
  if (id) params.set("id", id);
  return `${origin}/_api/share/page?${params.toString()}`;
};

