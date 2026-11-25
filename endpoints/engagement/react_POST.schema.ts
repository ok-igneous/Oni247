import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  slug: z.string().min(1).max(120),
  targetType: z.enum(["blog", "product", "event", "gallery", "comment"]),
  targetId: z.string().uuid(),
  visitorKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  /** The reaction to set, or null to take it back. */
  kind: z.enum(["like", "love", "clap", "wow"]).nullable(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { saved: true };

export const postReaction = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/engagement/react`, {
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
