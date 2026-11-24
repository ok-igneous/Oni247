export type BlogSettings = {
  layout: "list" | "grid" | "magazine";
  showCover: boolean;
  showExcerpt: boolean;
  showDate: boolean;
  showReadTime: boolean;
  postsPerPage: number;
  /** Space at the top of the list for the newest post. */
  featureFirst: boolean;
};

const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

/** Reads businesses.blog_settings defensively; shared by server and client. */
export const parseBlogSettings = (raw: unknown): BlogSettings => {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const per = Number(source.postsPerPage);
  return {
    layout:
      source.layout === "grid" || source.layout === "magazine" ? source.layout : "list",
    showCover: bool(source.showCover, true),
    showExcerpt: bool(source.showExcerpt, true),
    showDate: bool(source.showDate, true),
    showReadTime: bool(source.showReadTime, true),
    postsPerPage: Number.isFinite(per) ? Math.min(30, Math.max(3, Math.round(per))) : 9,
    featureFirst: bool(source.featureFirst, false),
  };
};
