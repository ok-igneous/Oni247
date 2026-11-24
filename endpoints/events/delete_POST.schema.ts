import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({ id: z.string().uuid() });
export type InputType = z.infer<typeof schema>;
export type OutputType = { deleted: true };

export const postDeleteEvent = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/events/delete`, {
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
