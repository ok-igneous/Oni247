import { z } from "zod";
import superjson from "superjson";
import type { Landing } from "../../helpers/landingConfig";

export const schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("save"), landing: z.record(z.unknown()) }),
  z.object({ op: z.literal("reset") }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true; landing: Landing };

export const postAdminLanding = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/admin/landing`, { method: "POST", body: superjson.stringify(valid), ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
