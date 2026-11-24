import { z } from "zod";
import superjson from "superjson";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));

export const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("testimonial"),
    id: z.string().uuid().nullish(),
    authorName: z.string().trim().min(1, "Whose words are these?").max(80),
    authorRole: optionalText(80),
    quote: z.string().trim().min(4, "Add the testimonial").max(600),
    rating: z.number().int().min(1).max(5).nullish(),
    imageUrl: optionalText(500),
    published: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
  }),
  z.object({
    kind: z.literal("portfolio"),
    id: z.string().uuid().nullish(),
    title: z.string().trim().min(1, "Give the work a title").max(120),
    description: optionalText(600),
    imageUrl: optionalText(500),
    linkUrl: optionalText(500),
    sortOrder: z.number().int().min(0).max(9999),
  }),
]);

export type InputType = z.infer<typeof schema>;

export type OutputType = { saved: true };

export const postSavePresence = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/presence/save`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
