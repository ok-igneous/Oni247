import superjson from "superjson";
import { z } from "zod";

export const schema = z.object({
  id: z.string().nullable().optional(),
  title: z.string().trim().min(2, "Give the post a title").max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens in the page address"),
  excerpt: z.string().trim().max(400, "The summary can be up to 400 characters").nullable(),
  coverImageUrl: z.string().trim().max(500).nullable(),
  content: z.string().trim().min(2, "Write something in the post").max(120000, "This post is too long"),
  published: z.boolean(),
  /** null = follow the shop-wide setting; true/false = override for this post. */
  commentsEnabled: z.boolean().nullable().optional(),
  reactionsEnabled: z.boolean().nullable().optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { saved: true };

export const postSaveBlog = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const r = await fetch("/_api/blog/save", {
    method: "POST",
    body: superjson.stringify(schema.parse(body)),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(superjson.parse<{ error: string }>(await r.text()).error);
  return superjson.parse<OutputType>(await r.text());
};
