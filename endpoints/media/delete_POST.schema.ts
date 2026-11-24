import superjson from "superjson";
import { z } from "zod";

export const schema = z.object({ id: z.string().uuid(), force: z.boolean().optional() });
export type InputType = z.infer<typeof schema>;

/**
 * Removes a picture from the library. If the picture is still used on the website the
 * call fails with the message IN_USE, unless force is true.
 */
export const postDeleteMedia = async (body: InputType, init?: RequestInit): Promise<{ deleted: true }> => {
  const validated = schema.parse(body);
  const result = await fetch("/_api/media/delete", {
    method: "POST",
    body: superjson.stringify(validated),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<{ deleted: true }>(await result.text());
};

