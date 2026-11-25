import { z } from "zod";
import superjson from "superjson";
import type { ReactionKind } from "../../helpers/parseEngagementSettings";

export const schema = z.object({
  slug: z.string().min(1).max(120),
  targetType: z.enum(["blog", "product", "event", "gallery"]),
  targetId: z.string().uuid(),
  visitorKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  order: z.enum(["recent", "popular"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).max(5000).optional(),
});

export type InputType = z.infer<typeof schema>;

export type PublicComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
};

export type OutputType = {
  config: {
    commentsEnabled: boolean;
    reactionsEnabled: boolean;
    reactionStyle: "like" | "multi";
    defaultOrder: "recent" | "popular";
    initialCount: number;
    moderation: "auto" | "manual";
  };
  reactions: {
    counts: Record<ReactionKind, number>;
    total: number;
    mine: ReactionKind | null;
  };
  comments: { items: PublicComment[]; total: number; hasMore: boolean };
};

export const getEngagement = async (
  input: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const valid = schema.parse(input);
  const params = new URLSearchParams({
    slug: valid.slug,
    targetType: valid.targetType,
    targetId: valid.targetId,
    visitorKey: valid.visitorKey,
  });
  if (valid.order) params.set("order", valid.order);
  if (valid.limit) params.set("limit", String(valid.limit));
  if (valid.offset) params.set("offset", String(valid.offset));
  const result = await fetch(`/_api/engagement/get?${params.toString()}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
