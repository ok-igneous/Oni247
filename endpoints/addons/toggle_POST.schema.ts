import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.enum(["events", "blog", "comments", "forms", "email", "team"]),
  enabled: z.boolean(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { id: InputType["id"]; enabled: boolean };

export const postToggleAddon = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/addons/toggle`, {
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
