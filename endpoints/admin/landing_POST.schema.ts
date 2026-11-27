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
    const body = await result.text();
    let message: string | undefined;
    const readMessage = (value: unknown): string | undefined => {
      if (!value || typeof value !== "object") return undefined;
      const record = value as Record<string, unknown>;
      if (typeof record.error === "string") return record.error;
      if (typeof record.message === "string") return record.message;
      return undefined;
    };
    try { message = readMessage(superjson.parse<unknown>(body)); } catch { /* non-SuperJSON response */ }
    if (!message) {
      try { message = readMessage(JSON.parse(body) as unknown); } catch { /* non-JSON response */ }
    }
    throw new Error(message || `Request failed (HTTP ${result.status}). Please try again.`);
  }
  return superjson.parse<OutputType>(await result.text());
};
