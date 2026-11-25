import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  kind: z.enum(["testimonial", "portfolio"]),
  id: z.string().uuid(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = { deleted: true };

export const postDeletePresence = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/presence/delete`, {
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
