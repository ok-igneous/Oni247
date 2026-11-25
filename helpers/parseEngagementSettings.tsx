export type EngagementTarget = "blog" | "product" | "event" | "gallery";
export type ReactionKind = "like" | "love" | "clap" | "wow";

export type EngagementSettings = {
  comments: Record<EngagementTarget, boolean>;
  reactions: Record<EngagementTarget, boolean>;
  /** auto = comments appear at once; manual = the owner approves each one. */
  moderation: "auto" | "manual";
  /** Which comments a visitor sees first. */
  defaultOrder: "recent" | "popular";
  /** How many comments show before "Show more". */
  initialCount: number;
  /** like = a single heart-style like; multi = like, love, clap, wow. */
  reactionStyle: "like" | "multi";
};

export const ENGAGEMENT_TARGETS: EngagementTarget[] = ["blog", "product", "event", "gallery"];
export const REACTION_KINDS: ReactionKind[] = ["like", "love", "clap", "wow"];

const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Reads businesses.engagement_settings defensively; shared by server and client. */
export const parseEngagementSettings = (raw: unknown): EngagementSettings => {
  const source = record(raw);
  const comments = record(source.comments);
  const reactions = record(source.reactions);
  const count = Number(source.initialCount);
  return {
    comments: {
      blog: bool(comments.blog, true),
      product: bool(comments.product, false),
      event: bool(comments.event, true),
      gallery: bool(comments.gallery, false),
    },
    reactions: {
      blog: bool(reactions.blog, true),
      product: bool(reactions.product, true),
      event: bool(reactions.event, true),
      gallery: bool(reactions.gallery, true),
    },
    moderation: source.moderation === "manual" ? "manual" : "auto",
    defaultOrder: source.defaultOrder === "popular" ? "popular" : "recent",
    initialCount: Number.isFinite(count) ? Math.min(50, Math.max(1, Math.round(count))) : 5,
    reactionStyle: source.reactionStyle === "multi" ? "multi" : "like",
  };
};
