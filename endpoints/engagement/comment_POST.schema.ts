import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  slug: z.string().min(1).max(120),
  targetType: z.enum(["blog", "product", "event", "gallery"]),
  targetId: z.string().uuid(),
  authorName: z.string().trim().min(2, "Enter your name").max(60),
  body: z.string().trim().min(2, "Write a comment first").max(1000, "Comments can be up to 1,000 characters"),
  /** Honeypot: real visitors never see or fill this. */
  website: z.string().max(200).optional(),
});

export type InputType = z.input<typeof schema>;

export type OutputType = {
  status: "approved" | "pending";
  message: string;
};

export const postComment = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/engagement/comment`, {
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
