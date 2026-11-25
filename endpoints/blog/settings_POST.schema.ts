import { z } from "zod";
import superjson from "superjson";
import type { BlogSettings } from "../../helpers/parseBlogSettings";

export const schema = z.object({
  layout: z.enum(["list", "grid", "magazine"]),
  showCover: z.boolean(),
  showExcerpt: z.boolean(),
  showDate: z.boolean(),
  showReadTime: z.boolean(),
  postsPerPage: z.number().int().min(3, "Show at least 3 posts").max(30, "Show up to 30 posts"),
  featureFirst: z.boolean(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { settings: BlogSettings };

export const postBlogSettings = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/blog/settings`, {
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
