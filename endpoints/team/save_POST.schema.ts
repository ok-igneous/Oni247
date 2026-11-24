import { z } from "zod";
import superjson from "superjson";

export const schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("member.save"), id: z.string().uuid().optional(), email: z.string().trim().email().max(200), displayName: z.string().trim().max(80), roleId: z.string().uuid() }),
  z.object({ op: z.literal("member.status"), id: z.string().uuid(), disabled: z.boolean() }),
  z.object({ op: z.literal("member.remove"), id: z.string().uuid() }),
  z.object({ op: z.literal("role.save"), id: z.string().uuid().optional(), name: z.string().trim().min(1).max(60), description: z.string().trim().max(240), permissions: z.array(z.string()).max(200) }),
  z.object({ op: z.literal("role.delete"), id: z.string().uuid() }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true; message: string };

export const postTeam = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/team/save`, {
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

