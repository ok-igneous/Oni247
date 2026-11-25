import { z } from "zod";
import superjson from "superjson";
import type { EngagementSettings } from "../../helpers/parseEngagementSettings";

const flags = z.object({
  blog: z.boolean(),
  product: z.boolean(),
  event: z.boolean(),
  gallery: z.boolean(),
});

export const schema = z.object({
  comments: flags,
  reactions: flags,
  moderation: z.enum(["auto", "manual"]),
  defaultOrder: z.enum(["recent", "popular"]),
  initialCount: z.number().int().min(1, "Show at least 1 comment").max(50, "Show up to 50 comments"),
  reactionStyle: z.enum(["like", "multi"]),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { settings: EngagementSettings };

export const postEngagementSettings = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/engagement/settings`, {
    method: "POST",
    body: superjson.stringify(valid),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};